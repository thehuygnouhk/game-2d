import { randomBytes } from "node:crypto";
import type { WebSocket } from "ws";
import {
  Appearance,
  CharacterName,
  ClientSchemas,
  decodeFrame,
  encodeFrame,
  ErrorCode,
  type ErrorCodeValue,
  FrameError,
  MAX_BAD_FRAMES,
  MAX_MOVE_INPUTS_PER_S,
  MAX_PACKETS_PER_S,
  MAX_SKILLS_PER_S,
  CHAT_MAP_INTERVAL_MS,
  Op,
  opName,
  PROTOCOL_VERSION,
  type SWelcome,
  TICK_RATE,
  SNAPSHOT_EVERY_TICKS,
  type CHello,
  type CMoveInput,
  type CUseSkill,
} from "@htk/shared";
import type { ServerConfig } from "../config";
import { pickup, useItem } from "../world/combat";
import { Player } from "../world/entities";
import type { World } from "../world/world";

const IDLE_TIMEOUT_MS = 30_000;

/** One WebSocket connection (network-protocol §3-4, §7). */
export class Session {
  private seq = 0;
  private strikes = 0;
  private stage: "hello" | "lobby" | "world" | "closed" = "hello";
  private name = "";
  private appearance: Appearance = { origin: "VILLAGER", gender: "MALE" };
  private player: Player | null = null;
  private windowStart = Date.now();
  private packets = 0;
  private moves = 0;
  private skills = 0;
  private floodSeconds = 0;
  private lastSeen = Date.now();

  constructor(
    private readonly ws: WebSocket,
    private readonly world: World,
    private readonly cfg: ServerConfig,
  ) {
    ws.binaryType = "nodebuffer";
    ws.on("message", (data, isBinary) => {
      try {
        this.onMessage(data as Buffer, isBinary);
      } catch (e) {
        // a bug in one command must not take the map host down (server-design §14)
        this.cfg.log("session.error", { name: this.name, message: (e as Error).message, stack: (e as Error).stack });
        this.error(ErrorCode.E_INTERNAL, 0, "internal error");
      }
    });
    ws.on("close", () => this.onClose());
    ws.on("error", () => this.onClose());
  }

  get idle(): boolean {
    return Date.now() - this.lastSeen > IDLE_TIMEOUT_MS;
  }

  send(op: number, payload: unknown): void {
    if (this.ws.readyState !== this.ws.OPEN) return;
    this.seq = (this.seq + 1) >>> 0;
    this.ws.send(encodeFrame(op, this.seq, payload));
  }

  private error(code: ErrorCodeValue, refSeq: number, message: string): void {
    this.send(Op.S_ERROR, { code, refSeq, message });
  }

  close(code: number, reason: string): void {
    if (this.stage === "closed") return;
    this.ws.close(code, reason);
    this.onClose();
  }

  private strike(refSeq: number, message: string): void {
    this.error(ErrorCode.E_INVALID_PAYLOAD, refSeq, message);
    if (++this.strikes >= MAX_BAD_FRAMES) this.close(1008, "too many invalid packets");
  }

  private countPacket(op: number): boolean {
    const now = Date.now();
    if (now - this.windowStart >= 1000) {
      this.floodSeconds = this.packets > MAX_PACKETS_PER_S ? this.floodSeconds + 1 : 0;
      this.windowStart = now;
      this.packets = 0;
      this.moves = 0;
      this.skills = 0;
      if (this.floodSeconds >= 10) {
        this.close(1008, "flood");
        return false;
      }
    }
    this.packets++;
    if (op === Op.C_MOVE_INPUT && ++this.moves > MAX_MOVE_INPUTS_PER_S) return false; // dropped, not an error
    if (op === Op.C_USE_SKILL && ++this.skills > MAX_SKILLS_PER_S) {
      this.error(ErrorCode.E_RATE_LIMIT, 0, "C_USE_SKILL over 10/s");
      return false;
    }
    return true;
  }

  private onMessage(data: Buffer, isBinary: boolean): void {
    if (this.stage === "closed") return;
    this.lastSeen = Date.now();
    if (!isBinary) return this.strike(0, "text frames are not allowed");
    let frame;
    try {
      frame = decodeFrame(data);
    } catch (e) {
      return this.strike(0, e instanceof FrameError ? e.message : "bad frame");
    }
    if (!this.countPacket(frame.op)) return;
    const schema = ClientSchemas[frame.op];
    if (!schema) return this.strike(frame.seq, `unknown opcode ${opName(frame.op)}`);
    const parsed = schema.safeParse(frame.payload);
    if (!parsed.success) return this.strike(frame.seq, `invalid ${opName(frame.op)}`);
    const p = parsed.data;
    switch (frame.op) {
      case Op.C_HELLO:
        return this.onHello(p as CHello, frame.seq);
      case Op.C_PING:
        return this.send(Op.S_PONG, { t: (p as { t: number }).t, serverTime: Date.now() });
      case Op.C_ENTER_WORLD:
        return this.onEnterWorld(frame.seq);
    }
    const pl = this.stage === "world" ? this.player : null;
    if (!pl?.zone) return; // in-game commands before C_ENTER_WORLD (or between maps) are ignored
    const w = this.world,
      now = w.now;
    switch (frame.op) {
      case Op.C_MOVE_INPUT:
        return pl.zone.queueInput(pl, p as CMoveInput);
      case Op.C_USE_SKILL:
        pl.skillQueue.push({ cmd: p as CUseSkill, at: now, refSeq: frame.seq });
        if (pl.skillQueue.length > 8) pl.skillQueue.shift();
        return;
      case Op.C_USE_PORTAL: {
        const q = p as { portalId: string; seq: number };
        return w.requestPortal(pl, q.portalId, q.seq, frame.seq);
      }
      case Op.C_REQUEST_ZONES: {
        const list = w.zoneList(pl);
        if (list) this.send(Op.S_ZONE_LIST, list);
        return;
      }
      case Op.C_CHANGE_ZONE:
        return w.changeZone(pl, (p as { zoneNo: number }).zoneNo, frame.seq);
      case Op.C_REVIVE:
        return w.revive(pl, frame.seq);
      case Op.C_PICKUP:
        return pickup(pl.zone, pl, (p as { dropId: number }).dropId, frame.seq, now);
      case Op.C_USE_ITEM:
        return useItem(pl.zone, pl, (p as { instanceId: string }).instanceId, frame.seq, now);
      case Op.C_CHAT_SEND: {
        // map chat: everyone in the same map and zone, one message per second (network-protocol §7)
        if (now - pl.lastChat < CHAT_MAP_INTERVAL_MS)
          return this.error(ErrorCode.E_RATE_LIMIT, frame.seq, "CHAT_TOO_FAST");
        pl.lastChat = now;
        pl.zone.chatAll("MAP", (p as { text: string }).text, pl);
        this.cfg.log("chat", { id: pl.id, map: pl.zone.key, len: (p as { text: string }).text.length });
        return;
      }
    }
  }

  private onHello(h: CHello, seq: number): void {
    if (this.stage !== "hello") return this.strike(seq, "C_HELLO sent twice");
    // network-protocol §11: N and N-1 once real players exist (step B3); until then exactly N
    if (h.protocolVersion !== PROTOCOL_VERSION) {
      this.error(
        ErrorCode.E_VERSION,
        seq,
        `protocol ${h.protocolVersion} not supported, server speaks ${PROTOCOL_VERSION}`,
      );
      return this.close(4001, "E_VERSION");
    }
    const guest =
      this.cfg.devGuest && h.ticket.startsWith("guest:") ? CharacterName.safeParse(h.ticket.slice(6)) : null;
    if (!guest?.success) {
      this.error(
        ErrorCode.E_AUTH,
        seq,
        this.cfg.devGuest ? "guest name must be 3-12 letters or digits" : "accounts arrive in step B3",
      );
      return this.close(4002, "E_AUTH");
    }
    this.name = guest.data;
    if (h.appearance) this.appearance = h.appearance;
    this.stage = "lobby";
    const welcome: SWelcome = {
      serverTime: Date.now(),
      tickRate: TICK_RATE,
      snapshotRate: TICK_RATE / SNAPSHOT_EVERY_TICKS,
      resumeToken: randomBytes(16).toString("hex"),
      config: { mapId: this.world.startMap },
    };
    this.send(Op.S_WELCOME, welcome);
    this.cfg.log("hello", { name: this.name, client: h.clientVersion });
  }

  private onEnterWorld(seq: number): void {
    if (this.stage !== "lobby") return this.strike(seq, "C_ENTER_WORLD before C_HELLO");
    const pl = new Player(this.world.nextId(), this.name, this.appearance, this, this.world.content);
    const enter = this.world.enter(pl);
    if (!enter) {
      this.error(ErrorCode.E_ZONE_FULL, seq, "ALL_ZONES_FULL");
      return this.close(4003, "full");
    }
    this.stage = "world";
    this.player = pl;
    this.send(Op.S_ENTER_WORLD, enter);
    this.cfg.log("enter", { id: pl.id, name: this.name, zone: pl.zone?.key, online: this.world.playerCount });
  }

  private onClose(): void {
    if (this.stage === "closed") return;
    this.stage = "closed";
    if (this.player) {
      this.world.leave(this.player);
      this.cfg.log("leave", { id: this.player.id, name: this.name, online: this.world.playerCount });
    }
  }

  /** Test hook: the player of this connection. */
  get entity(): Player | null {
    return this.player;
  }
}

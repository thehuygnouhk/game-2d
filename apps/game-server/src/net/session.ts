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
  Op,
  opName,
  PROTOCOL_VERSION,
  type SWelcome,
  TICK_RATE,
  SNAPSHOT_EVERY_TICKS,
  type CHello,
  type CMoveInput,
} from "@htk/shared";
import type { ServerConfig } from "../config";
import { Player, type Zone } from "../world/zone";

let nextEntityId = 1;
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
  private floodSeconds = 0;
  private lastSeen = Date.now();

  constructor(
    private readonly ws: WebSocket,
    private readonly zone: Zone,
    private readonly cfg: ServerConfig,
  ) {
    ws.binaryType = "nodebuffer";
    ws.on("message", (data, isBinary) => this.onMessage(data as Buffer, isBinary));
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
      if (this.floodSeconds >= 10) {
        this.close(1008, "flood");
        return false;
      }
    }
    this.packets++;
    if (op === Op.C_MOVE_INPUT && ++this.moves > MAX_MOVE_INPUTS_PER_S) return false; // dropped, not an error
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
      case Op.C_MOVE_INPUT:
        if (this.stage === "world" && this.player) this.zone.queueInput(this.player, p as CMoveInput);
        return;
    }
  }

  private onHello(h: CHello, seq: number): void {
    if (this.stage !== "hello") return this.strike(seq, "C_HELLO sent twice");
    if (h.protocolVersion !== PROTOCOL_VERSION && h.protocolVersion !== PROTOCOL_VERSION - 1) {
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
      config: { mapId: this.zone.mapId },
    };
    this.send(Op.S_WELCOME, welcome);
    this.cfg.log("hello", { name: this.name, client: h.clientVersion });
  }

  private onEnterWorld(seq: number): void {
    if (this.stage !== "lobby") return this.strike(seq, "C_ENTER_WORLD before C_HELLO");
    this.stage = "world";
    this.player = new Player(nextEntityId++, this.name, this.appearance, this, this.zone.spawn);
    this.zone.add(this.player);
    this.cfg.log("enter", {
      id: this.player.id,
      name: this.name,
      map: this.zone.mapId,
      online: this.zone.players.size,
    });
  }

  private onClose(): void {
    if (this.stage === "closed") return;
    this.stage = "closed";
    if (this.player) {
      this.zone.remove(this.player);
      this.cfg.log("leave", { id: this.player.id, name: this.name, online: this.zone.players.size });
    }
  }
}

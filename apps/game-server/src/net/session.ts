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
  MAX_SHOP_PER_S,
  CHAT_MAP_INTERVAL_MS,
  CHAT_WORLD_INTERVAL_MS,
  type CAllocatePoints,
  type SKick,
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
import type { CharacterRow, ItemRow, QuestRow } from "@htk/db";
import type { ServerConfig } from "../config";
import { allocatePoints, fail, pickup, useItem } from "../world/combat";
import { buy, equip, openChest, sell, unequip } from "../world/items";
import { Player } from "../world/entities";
import type { World } from "../world/world";

/** What the API put in Redis for the game server (apps/api, security §3). */
export interface Ticket {
  accountId: string;
  characterId: string;
  realmId: number;
}
/** Accounts (step B3): one-use tickets from Redis, characters from PostgreSQL. */
export interface AccountGate {
  realmId: number;
  takeTicket(ticket: string): Promise<Ticket | null>;
  loadCharacter(id: string): Promise<{ char: CharacterRow; bag: ItemRow[]; quests: QuestRow[] } | null>;
}

const IDLE_TIMEOUT_MS = 30_000;

/** One WebSocket connection (network-protocol §3-4, §7). */
export class Session {
  private seq = 0;
  private strikes = 0;
  private stage: "hello" | "auth" | "lobby" | "world" | "closed" = "hello";
  private loaded: { ticket: Ticket; char: CharacterRow; bag: ItemRow[]; quests: QuestRow[] } | null = null;
  private name = "";
  private appearance: Appearance = { origin: "VILLAGER", gender: "MALE" };
  private player: Player | null = null;
  private windowStart = Date.now();
  private packets = 0;
  private moves = 0;
  private skills = 0;
  private shop = 0;
  private floodSeconds = 0;
  private lastSeen = Date.now();

  constructor(
    private readonly ws: WebSocket,
    private readonly world: World,
    private readonly cfg: ServerConfig,
    private readonly gate?: AccountGate,
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
      this.shop = 0;
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
    if ((op === Op.C_SHOP_BUY || op === Op.C_SHOP_SELL) && ++this.shop > MAX_SHOP_PER_S) {
      this.error(ErrorCode.E_RATE_LIMIT, 0, "C_SHOP_* over 5/s");
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
      case Op.C_ALLOCATE_POINTS:
        return allocatePoints(pl, p as CAllocatePoints, frame.seq, now);
      case Op.C_EQUIP:
        return equip(w, pl, (p as { instanceId: string }).instanceId, frame.seq);
      case Op.C_UNEQUIP:
        return unequip(w, pl, (p as { slot: "weapon" }).slot, frame.seq);
      case Op.C_NPC_INTERACT:
        return w.quests.interact(pl, (p as { npcId: string }).npcId, frame.seq);
      case Op.C_NPC_CHOICE: {
        const c = p as { npcId: string; optionId: string };
        return w.quests.choice(pl, c.npcId, c.optionId, frame.seq);
      }
      case Op.C_CHOOSE_CLASS:
        return void w.quests.chooseClass(pl, (p as { classId: "FIRE" | "WATER" }).classId, frame.seq);
      case Op.C_USE_OBJECT: {
        const id = (p as { objectId: string }).objectId;
        if (!pl.alive) return fail(pl, ErrorCode.E_DEAD, frame.seq, "DEAD");
        if (id === "CHEST") return openChest(w, pl, frame.seq);
        if (id === "ALTAR") return w.quests.useAltar(pl, frame.seq);
        if (id.startsWith("HERB:")) return w.quests.gather(pl, id, frame.seq);
        return fail(pl, ErrorCode.E_INVALID_TARGET, frame.seq, "NO_OBJECT");
      }
      case Op.C_SHOP_BUY: {
        const b = p as { shopId: string; itemId: string; qty: number; idemKey: string };
        return buy(w, pl, b.shopId, b.itemId, b.qty, b.idemKey, frame.seq);
      }
      case Op.C_SHOP_SELL: {
        const b = p as { instanceId: string; qty: number; idemKey: string };
        return sell(w, pl, b.instanceId, b.qty, b.idemKey, frame.seq);
      }
      case Op.C_LEAVE_INSTANCE:
        return w.leaveInstance(pl);
      case Op.C_CHAT_SEND: {
        // map chat: same map and zone, 1 per second; world chat: whole realm, 1 per 10 s (network-protocol §7)
        const { channel, text } = p as { channel: "MAP" | "WORLD"; text: string };
        if (channel === "WORLD") {
          if (now - pl.lastWorldChat < CHAT_WORLD_INTERVAL_MS)
            return this.error(ErrorCode.E_RATE_LIMIT, frame.seq, "WORLD_CHAT_TOO_FAST");
          pl.lastWorldChat = now;
          w.chatWorld(pl, text);
        } else {
          if (now - pl.lastChat < CHAT_MAP_INTERVAL_MS)
            return this.error(ErrorCode.E_RATE_LIMIT, frame.seq, "CHAT_TOO_FAST");
          pl.lastChat = now;
          pl.zone.chatAll("MAP", text, pl);
        }
        this.cfg.log("chat", { id: pl.id, channel, map: pl.zone.key, len: text.length });
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
    if (!h.ticket.startsWith("guest:")) {
      if (!this.gate) {
        this.error(ErrorCode.E_AUTH, seq, "accounts are not enabled on this server");
        return this.close(4002, "E_AUTH");
      }
      this.stage = "auth";
      void this.redeem(h, seq);
      return;
    }
    const guest = this.cfg.devGuest ? CharacterName.safeParse(h.ticket.slice(6)) : null;
    if (!guest?.success) {
      this.error(
        ErrorCode.E_AUTH,
        seq,
        this.cfg.devGuest ? "guest name must be 3-12 letters or digits" : "sign in first",
      );
      return this.close(4002, "E_AUTH");
    }
    this.name = guest.data;
    if (h.appearance) this.appearance = h.appearance;
    this.welcome(h);
  }

  /** Ticket from the API → character from the database (network-protocol §3, security §3). */
  private async redeem(h: CHello, seq: number): Promise<void> {
    const gate = this.gate!;
    try {
      const t = await gate.takeTicket(h.ticket); // one use: taken out of Redis
      if (!t || t.realmId !== gate.realmId) {
        this.error(ErrorCode.E_AUTH, seq, "ticket expired or already used");
        return this.close(4002, "E_AUTH");
      }
      // one session per account: the old one is kicked and its final save finishes before we load
      const old = this.world.accounts.get(t.accountId);
      if (old) (old.out as Session).kick("DUPLICATE_LOGIN", "Tài khoản vừa đăng nhập ở nơi khác.");
      await this.world.leaving.get(t.accountId);
      const data = await gate.loadCharacter(t.characterId);
      if (this.stage !== "auth") return; // closed meanwhile
      if (!data || data.char.account_id !== t.accountId) {
        this.error(ErrorCode.E_AUTH, seq, "no such character");
        return this.close(4002, "E_AUTH");
      }
      this.loaded = { ticket: t, ...data };
      this.name = data.char.name;
      this.appearance = { origin: data.char.origin, gender: data.char.gender === "F" ? "FEMALE" : "MALE" };
      this.welcome(h);
    } catch (e) {
      this.cfg.log("auth.error", { message: (e as Error).message });
      this.error(ErrorCode.E_INTERNAL, seq, "sign-in failed");
      this.close(1011, "E_INTERNAL");
    }
  }

  /** S_KICK then close (network-protocol §3.2). */
  kick(reason: SKick["reason"], message: string): void {
    this.send(Op.S_KICK, { reason, message } satisfies SKick);
    this.close(4005, reason);
  }

  private welcome(h: CHello): void {
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
    const l = this.loaded;
    const store = l && this.world.store ? this.world.store : this.world.guestStore;
    const pl = new Player(this.world.nextId(), this.name, this.appearance, this, this.world.content, store);
    let at: { mapId: string; x: number; y: number } | undefined;
    if (l) {
      const c = l.char;
      pl.accountId = l.ticket.accountId;
      pl.characterId = c.id;
      pl.lv = c.level;
      pl.exp = c.exp;
      pl.statPoints = c.stat_points;
      pl.pts = { hp: c.pts_hp, mp: c.pts_mp, atk: c.pts_atk, def: c.pts_def, crit: c.pts_crit };
      pl.recompute(true);
      pl.hp = c.hp > 0 ? Math.min(c.hp, pl.stats.hp) : pl.stats.hp;
      pl.mp = Math.min(Math.max(0, c.mp), pl.stats.mp);
      pl.bag.load(c.soft_currency, l.bag);
      pl.cls = c.class === "FIRE" || c.class === "WATER" ? c.class : null;
      pl.clsChangedAt = c.class_changed_at ? new Date(c.class_changed_at).getTime() : 0;
      for (const q of l.quests) pl.quests.set(q.quest_id, { ...q, progress: [...q.progress] });
      pl.playedBefore = c.play_seconds;
      pl.recompute();
      pl.hp = c.hp > 0 ? Math.min(c.hp, pl.stats.hp) : pl.stats.hp;
      pl.mp = Math.min(Math.max(0, c.mp), pl.stats.mp);
      at = { mapId: c.map_id, x: c.pos_x, y: c.pos_y };
    }
    const enter = this.world.enter(pl, at);
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
      void this.world.leave(this.player);
      this.cfg.log("leave", { id: this.player.id, name: this.name, online: this.world.playerCount });
    }
  }

  /** Test hook: the player of this connection. */
  get entity(): Player | null {
    return this.player;
  }
}

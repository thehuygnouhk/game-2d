import { randomUUID } from "node:crypto";
import type { Content, GameMap } from "@htk/content";
import {
  type CollisionMap,
  collisionFromTiled,
  dungeonScale,
  ErrorCode,
  Op,
  type Rng,
  RULES,
  type SEnterWorld,
  type SkillInfo,
  type SMapChange,
  type SZoneList,
  TICK_MS,
  type TiledMap,
} from "@htk/shared";
import { BossSchedule } from "./boss";
import { fail, sendStats } from "./combat";
import type { Player } from "./entities";
import { Quests } from "./quests";
import { MemoryStore, type Store } from "./store";
import { type Instance, Zone } from "./zone";

/** Write-behind period of position, HP, MP and EXP (server-design §8). */
export const SAVE_EVERY_TICKS = 60 * 20;

export interface WorldOptions {
  content: Content;
  startMap: string;
  rng: Rng;
  zonesPerMap?: number;
  /** override every zone capacity (tests) */
  zoneCap?: number;
  /** where accounts are saved (PgStore); unset: no accounts, development guests only */
  store?: Store;
  log?: (event: string, data?: Record<string, unknown>) => void;
  /** wall clock (epoch ms) for boss schedules and the class change window; tests may fake it */
  clock?: () => number;
}

/** Public maps with their zones (khu 1..n), shared clock and entity ids (server-design §3). */
export class World {
  readonly content: Content;
  /** random source of every roll; tests may swap it */
  rng: Rng;
  readonly startMap: string;
  readonly zones = new Map<string, Zone[]>();
  tick = 0;
  now = 0;
  private id = 1;
  private readonly pending = new Map<Player, { portalId: string; seq: number; refSeq: number; at: number }>();
  /** accounts in the world: one session each (network-protocol §3.2) */
  readonly accounts = new Map<string, Player>();
  /** final saves of players who left, by account: a new login waits for it */
  readonly leaving = new Map<string, Promise<unknown>>();
  readonly guestStore: Store;
  readonly store: Store | undefined;
  readonly log: (event: string, data?: Record<string, unknown>) => void;
  /** dungeon runs and ceremony halls (step B4) */
  readonly instances = new Set<Zone>();
  private readonly privateMaps = new Map<string, { map: GameMap; coll: CollisionMap }>();
  clock: () => number;
  readonly quests: Quests;
  readonly bosses: BossSchedule;

  constructor(opts: WorldOptions) {
    this.content = opts.content;
    this.rng = opts.rng;
    this.startMap = opts.startMap;
    this.store = opts.store;
    this.log = opts.log ?? (() => {});
    this.clock = opts.clock ?? Date.now;
    this.guestStore = new MemoryStore(this.log);
    for (const m of opts.content.maps.values()) {
      if (m.type === "DUNGEON" || m.type === "INSTANCE") {
        this.privateMaps.set(m.id, { map: m, coll: collisionFromTiled(m.tiled as TiledMap) });
        continue;
      }
      if (m.type !== "TOWN" && m.type !== "FIELD") continue;
      const coll = collisionFromTiled(m.tiled as TiledMap);
      const cap = opts.zoneCap ?? m.zoneCap ?? 30;
      const list: Zone[] = [];
      this.zones.set(m.id, list);
      for (let z = 1; z <= (opts.zonesPerMap ?? RULES.zonesPerMap); z++) list.push(new Zone(this, m, z, coll, cap));
    }
    if (!this.zones.has(opts.startMap)) throw new Error(`start map ${opts.startMap} is not a hosted map`);
    this.quests = new Quests(this);
    this.bosses = new BossSchedule(this);
  }

  /** every zone that ticks: public zones and private instances */
  *allZones(): Iterable<Zone> {
    for (const list of this.zones.values()) yield* list;
    yield* this.instances;
  }

  /** Send to every player of the realm. */
  broadcast(op: number, payload: unknown): void {
    for (const z of this.allZones()) for (const p of z.players.values()) p.out.send(op, payload);
  }

  nextId(): number {
    return this.id++;
  }

  get playerCount(): number {
    let n = 0;
    for (const z of this.allZones()) n += z.players.size;
    return n;
  }

  zone(mapId: string, zoneNo: number): Zone | undefined {
    return this.zones.get(mapId)?.[zoneNo - 1];
  }

  /** The preferred zone when it has room, else the first with room (server-design §3). */
  pickZone(mapId: string, prefer?: number): Zone | null {
    const list = this.zones.get(mapId);
    if (!list) return null;
    const want = prefer ? list[prefer - 1] : undefined;
    if (want && want.players.size < want.cap) return want;
    return list.find((z) => z.players.size < z.cap) ?? null;
  }

  update(): void {
    this.tick++;
    this.now += TICK_MS;
    for (const z of [...this.allZones()]) z.update(this.now);
    if (this.tick % 20 === 0) this.bosses.tick();
    for (const [p, req] of this.pending)
      if (p.ack >= req.seq || this.now - req.at >= 500) {
        this.pending.delete(p);
        this.portal(p, req.portalId, req.refSeq);
      }
    if (this.tick % SAVE_EVERY_TICKS === 0) for (const p of this.accounts.values()) this.save(p);
  }

  /** Queue a write-behind save of an account player; errors are logged, the next save retries. */
  save(p: Player): Promise<unknown> {
    return p.enqueue(() => p.store.save(p)).catch((e) => p.store.onError(p, "save", e));
  }

  /** Save everyone (shutdown). */
  async saveAll(): Promise<void> {
    await Promise.all([...this.accounts.values()].map((p) => this.save(p)));
    await Promise.all(this.leaving.values());
  }

  /** World chat (network-protocol §6.8): every player of the realm. */
  chatWorld(from: Player, text: string): void {
    this.broadcast(Op.S_CHAT_MSG, { channel: "WORLD", fromId: from.id, fromName: from.name, text, time: Date.now() });
  }

  replicate(): void {
    for (const z of this.allZones()) if (z.players.size) z.replicate();
  }

  /** Novice skills, then the class skills (keys J, 1, 2, 3, 4; classes §3-4). */
  skillsOf(p: Player): SkillInfo[] {
    const keys = ["J", "1", "2", "3", "4"];
    return [...this.content.skills.values()]
      .filter((s) => s.set === "NOVICE" || s.set === p.cls)
      .sort((a, b) => Number(a.set !== "NOVICE") - Number(b.set !== "NOVICE") || a.unlockLevel - b.unlockLevel)
      .map((s, i) => ({
        id: s.id,
        name: this.content.text(s.nameKey),
        unlockLevel: s.unlockLevel,
        mp: s.mp,
        cooldownMs: Math.round(s.cooldownSec * 1000),
        key: keys[i],
        shape: s.shape,
      }));
  }

  private place(p: Player, z: Zone, x: number, y: number): SMapChange {
    const view = z.add(p, x, y);
    const s = p.state();
    const npcs = this.quests.npcsOn(p, z.mapId).map((n) => {
      const d = this.content.npcs.get(n.id);
      return { id: n.id, name: d ? this.content.text(d.nameKey) : n.id, face: d?.face ?? 0, x: n.x, y: n.y };
    });
    return {
      map: { id: z.mapId, zone: z.zoneNo, name: this.content.text(z.map.nameKey) },
      npcs,
      tick: this.tick,
      ack: p.ack,
      body: { x: s.x, y: s.y, vy: s.vy, st: s.st },
      entities: view.entities,
      drops: view.drops,
    };
  }

  /** Put a player in the world: at the saved spot when it is still valid, else at the start map spawn. */
  enter(p: Player, at?: { mapId: string; x: number; y: number }): SEnterWorld | null {
    const saved = at && this.zones.has(at.mapId) && at.x >= 0 && at.y >= 0 ? at : undefined;
    const z = this.pickZone(saved?.mapId ?? this.startMap) ?? (saved ? this.pickZone(this.startMap) : null);
    if (!z) return null;
    const pos = saved && z.mapId === saved.mapId ? saved : z.map.spawn;
    const placed = this.place(p, z, pos.x, pos.y);
    if (p.accountId) this.accounts.set(p.accountId, p);
    const bag = { soft: p.bag.soft, items: p.bag.items, size: p.bag.size };
    return {
      ...placed,
      you: p.id,
      character: { name: p.name, appearance: p.appearance, cls: p.cls },
      stats: p.full(this.now),
      skills: this.skillsOf(p),
      bag,
      equipment: { ...p.bag.equip },
      quests: this.quests.update(p),
    };
  }

  /** Take a player out; accounts get a final save (server-design §8). */
  leave(p: Player): Promise<unknown> {
    this.pending.delete(p);
    p.lastZone = p.zone ?? p.lastZone;
    const z = p.zone;
    z?.remove(p);
    if (z) this.closeIfEmpty(z);
    if (!p.accountId || this.accounts.get(p.accountId) !== p) return Promise.resolve();
    this.accounts.delete(p.accountId);
    const acc = p.accountId;
    const done = this.save(p).finally(() => {
      if (this.leaving.get(acc) === done) this.leaving.delete(acc);
    });
    this.leaving.set(acc, done);
    return done;
  }

  /** Move to another map or zone and tell the player (S_MAP_CHANGE). */
  transfer(p: Player, z: Zone, x: number, y: number): void {
    const from = p.zone;
    from?.remove(p);
    if (from && from !== z) this.closeIfEmpty(from);
    p.shopNpc = null;
    p.out.send(Op.S_MAP_CHANGE, this.place(p, z, x, y));
    if (z.inst) p.out.send(Op.S_INSTANCE_STATE, z.instanceState(p));
  }

  private closeIfEmpty(z: Zone): void {
    if (z.inst && z.players.size === 0 && this.instances.delete(z)) this.log("instance.close", { map: z.mapId });
  }

  private openInstance(p: Player, mapId: string, inst: Instance): Zone | null {
    const pm = this.privateMaps.get(mapId);
    if (!pm) return null;
    inst.runId = randomUUID();
    const z = new Zone(this, pm.map, 1, pm.coll, pm.map.zoneCap ?? 5, inst);
    this.instances.add(z);
    this.log("instance.open", { map: mapId, player: p.id });
    return z;
  }

  /** A new run of a dungeon (maps §6.1-6.2): alone, scaled for one player. */
  openDungeon(p: Player, dungeonId: string, refSeq: number): void {
    const dg = this.content.dungeons.get(dungeonId);
    if (!dg) return fail(p, ErrorCode.E_MAP_LOCKED, refSeq, `MAP_NOT_OPEN:${dungeonId}`);
    if (p.lv < dg.minLevel) return fail(p, ErrorCode.E_LEVEL_REQUIRED, refSeq, `LEVEL_${dg.minLevel}`);
    const z = this.openInstance(p, dungeonId, {
      kind: "DUNGEON",
      ownerId: p.id,
      entry: { mapId: dg.entry.map, x: dg.entry.x, y: dg.entry.y },
      endsAt: this.now + dg.timeLimitMin * 60_000,
      scale: dungeonScale(1),
      dungeon: dg,
      boss: null,
      bossDown: false,
      chest: null,
      opened: new Set(),
    });
    if (!z) return fail(p, ErrorCode.E_MAP_LOCKED, refSeq, `MAP_NOT_OPEN:${dungeonId}`);
    this.transfer(p, z, z.map.spawn.x, z.map.spawn.y);
  }

  /** Q_MAIN_12: Thầy takes the player into the ceremony hall I001 (quests §4). */
  openCeremony(p: Player): void {
    if (p.zone?.inst?.kind === "CEREMONY") return;
    const back = this.content.maps.get("I001")?.portals[0];
    const z = this.openInstance(p, "I001", {
      kind: "CEREMONY",
      ownerId: p.id,
      entry: { mapId: back?.to ?? "M001", x: back?.toX ?? 368, y: back?.toY ?? 480 },
      endsAt: Infinity,
      scale: { hp: 1, atk: 1, reward: 1 },
      boss: null,
      bossDown: false,
      chest: null,
      opened: new Set(),
    });
    if (z) this.transfer(p, z, z.map.spawn.x, z.map.spawn.y);
  }

  /** C_LEAVE_INSTANCE, a timed-out dungeon: back to the way in. */
  leaveInstance(p: Player): void {
    const z = p.zone;
    if (!z?.inst) return;
    if (!p.alive) {
      p.alive = true;
      p.hp = p.stats.hp;
      p.mp = p.stats.mp;
      p.out.send(Op.S_REVIVED, { x: 0, y: 0, hp: p.hp, mp: Math.floor(p.mp) });
    }
    const e = z.inst.entry;
    const to = this.pickZone(e.mapId);
    if (to) this.transfer(p, to, e.x, e.y);
    sendStats(p, { hp: Math.ceil(p.hp), mp: Math.floor(p.mp) });
  }

  /** C_USE_PORTAL waits until the movement before it has been simulated (C_USE_PORTAL.seq). */
  requestPortal(p: Player, portalId: string, seq: number, refSeq: number): void {
    this.pending.set(p, { portalId, seq, refSeq, at: this.now });
  }

  private portal(p: Player, portalId: string, refSeq: number): void {
    const z = p.zone;
    if (!z) return;
    if (!p.alive) return fail(p, ErrorCode.E_DEAD, refSeq, "DEAD");
    const g = z.map.portals.find((x) => x.id === portalId);
    if (!g) return fail(p, ErrorCode.E_INVALID_TARGET, refSeq, "NO_PORTAL");
    const { x, y } = p.body,
      pad = 16;
    if (x < g.x - pad || x > g.x + g.w + pad || y < g.y - pad || y > g.y + g.h + pad)
      return fail(p, ErrorCode.E_OUT_OF_RANGE, refSeq, "NOT_AT_PORTAL");
    if (this.content.dungeons.has(g.to)) return this.openDungeon(p, g.to, refSeq);
    if (!this.zones.has(g.to)) return fail(p, ErrorCode.E_MAP_LOCKED, refSeq, `MAP_NOT_OPEN:${g.to}`);
    const to = this.pickZone(g.to, z.inst ? 1 : z.zoneNo);
    if (!to) return fail(p, ErrorCode.E_ZONE_FULL, refSeq, "ALL_ZONES_FULL");
    this.transfer(p, to, g.toX, g.toY);
  }

  zoneList(p: Player): SZoneList | null {
    const z = p.zone;
    if (!z) return null;
    return {
      mapId: z.mapId,
      zones: (this.zones.get(z.mapId) ?? []).map((x) => ({ zoneNo: x.zoneNo, players: x.players.size, cap: x.cap })),
    };
  }

  /** C_CHANGE_ZONE: same map, same spot, out of combat only (server-design §3). */
  changeZone(p: Player, zoneNo: number, refSeq: number): void {
    const z = p.zone;
    if (!z) return;
    if (!p.alive) return fail(p, ErrorCode.E_DEAD, refSeq, "DEAD");
    const to = this.zone(z.mapId, zoneNo);
    if (!to || to === z) return fail(p, ErrorCode.E_INVALID_TARGET, refSeq, "NO_SUCH_ZONE");
    if (this.now - p.lastCombat < 5000) return fail(p, ErrorCode.E_IN_COMBAT, refSeq, "IN_COMBAT");
    if (to.players.size >= to.cap) return fail(p, ErrorCode.E_ZONE_FULL, refSeq, "ZONE_FULL");
    this.transfer(p, to, p.body.x, p.body.y);
  }

  townOf(from: GameMap): GameMap {
    return this.town(from);
  }

  private town(from: GameMap): GameMap {
    const maps = [...this.content.maps.values()].filter((m) => m.type === "TOWN" && this.zones.has(m.id));
    return maps.find((m) => m.region === from.region) ?? this.content.maps.get(this.startMap)!;
  }

  /** C_REVIVE TOWN: free revive in the nearest town, full HP and MP, 1 s protection (combat §4.1, §7). */
  revive(p: Player, refSeq: number): void {
    const z = p.zone;
    if (!z) return;
    if (p.alive) return fail(p, ErrorCode.E_INVALID_TARGET, refSeq, "NOT_DEAD");
    if (z.inst) {
      // falling in a dungeon ends the run: back at its gate (maps §6.2)
      p.invulnUntil = this.now + RULES.reviveInvulnMs;
      p.lastCombat = -1e9;
      this.leaveInstance(p);
      return;
    }
    const town = this.town(z.map);
    const to = this.pickZone(town.id, z.zoneNo);
    if (!to) return fail(p, ErrorCode.E_ZONE_FULL, refSeq, "ALL_ZONES_FULL");
    p.alive = true;
    p.hp = p.stats.hp;
    p.mp = p.stats.mp;
    p.invulnUntil = this.now + RULES.reviveInvulnMs;
    p.lastCombat = -1e9;
    this.transfer(p, to, town.spawn.x, town.spawn.y);
    p.out.send(Op.S_REVIVED, { x: p.body.x, y: p.body.y, hp: p.hp, mp: Math.floor(p.mp) });
    sendStats(p, { hp: p.hp, mp: Math.floor(p.mp) });
  }
}

import type { Content, GameMap } from "@htk/content";
import {
  collisionFromTiled,
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
import { fail, sendStats } from "./combat";
import type { Player } from "./entities";
import { Zone } from "./zone";

export interface WorldOptions {
  content: Content;
  startMap: string;
  rng: Rng;
  zonesPerMap?: number;
  /** override every zone capacity (tests) */
  zoneCap?: number;
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

  constructor(opts: WorldOptions) {
    this.content = opts.content;
    this.rng = opts.rng;
    this.startMap = opts.startMap;
    for (const m of opts.content.maps.values()) {
      if (m.type !== "TOWN" && m.type !== "FIELD") continue; // dungeons and instances come later
      const coll = collisionFromTiled(m.tiled as TiledMap);
      const cap = opts.zoneCap ?? m.zoneCap ?? 30;
      const list: Zone[] = [];
      this.zones.set(m.id, list);
      for (let z = 1; z <= (opts.zonesPerMap ?? RULES.zonesPerMap); z++) list.push(new Zone(this, m, z, coll, cap));
    }
    if (!this.zones.has(opts.startMap)) throw new Error(`start map ${opts.startMap} is not a hosted map`);
  }

  nextId(): number {
    return this.id++;
  }

  get playerCount(): number {
    let n = 0;
    for (const list of this.zones.values()) for (const z of list) n += z.players.size;
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
    for (const list of this.zones.values()) for (const z of list) z.update(this.now);
    for (const [p, req] of this.pending)
      if (p.ack >= req.seq || this.now - req.at >= 500) {
        this.pending.delete(p);
        this.portal(p, req.portalId, req.refSeq);
      }
  }

  replicate(): void {
    for (const list of this.zones.values()) for (const z of list) if (z.players.size) z.replicate();
  }

  private skills(): SkillInfo[] {
    return [...this.content.skills.values()]
      .filter((s) => s.set === "NOVICE")
      .map((s) => ({
        id: s.id,
        name: this.content.text(s.nameKey),
        unlockLevel: s.unlockLevel,
        mp: s.mp,
        cooldownMs: Math.round(s.cooldownSec * 1000),
      }));
  }

  private place(p: Player, z: Zone, x: number, y: number): SMapChange {
    const view = z.add(p, x, y);
    const s = p.state();
    return {
      map: { id: z.mapId, zone: z.zoneNo, name: this.content.text(z.map.nameKey) },
      tick: this.tick,
      ack: p.ack,
      body: { x: s.x, y: s.y, vy: s.vy, st: s.st },
      entities: view.entities,
      drops: view.drops,
    };
  }

  enter(p: Player): SEnterWorld | null {
    const z = this.pickZone(this.startMap);
    if (!z) return null;
    const placed = this.place(p, z, z.map.spawn.x, z.map.spawn.y);
    const bag = { soft: p.bag.soft, items: p.bag.items, size: p.bag.size };
    return {
      ...placed,
      you: p.id,
      character: { name: p.name, appearance: p.appearance },
      stats: p.full(this.now),
      skills: this.skills(),
      bag,
    };
  }

  leave(p: Player): void {
    this.pending.delete(p);
    p.zone?.remove(p);
  }

  /** Move to another map or zone and tell the player (S_MAP_CHANGE). */
  transfer(p: Player, z: Zone, x: number, y: number): void {
    p.zone?.remove(p);
    p.out.send(Op.S_MAP_CHANGE, this.place(p, z, x, y));
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
    if (!this.zones.has(g.to)) return fail(p, ErrorCode.E_MAP_LOCKED, refSeq, `MAP_NOT_OPEN:${g.to}`);
    const to = this.pickZone(g.to, z.zoneNo);
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

  private town(from: GameMap): GameMap {
    const maps = [...this.content.maps.values()].filter((m) => m.type === "TOWN" && this.zones.has(m.id));
    return maps.find((m) => m.region === from.region) ?? this.content.maps.get(this.startMap)!;
  }

  /** C_REVIVE TOWN: free revive in the nearest town, full HP and MP, 1 s protection (combat §4.1, §7). */
  revive(p: Player, refSeq: number): void {
    const z = p.zone;
    if (!z) return;
    if (p.alive) return fail(p, ErrorCode.E_INVALID_TARGET, refSeq, "NOT_DEAD");
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

import type { Dungeon, GameMap, MobSpawn as SpawnDef } from "@htk/content";
import {
  AOI_CELL,
  type Body,
  type CMoveInput,
  type CollisionMap,
  type EntityDelta,
  type EntitySpawn,
  mobStats,
  Op,
  rollTier,
  RULES,
  type SBossState,
  type SDropSpawn,
  type SInstanceState,
  type Telegraph,
  step,
  TILE,
  Tile,
  tileAt,
} from "@htk/shared";
import { spawnBoss, tickBoss } from "./boss";
import { hitMob, mobAttackLands, mobHitBox, type PlayerShot, runSkills, shotLands, tickPlayerStatus } from "./combat";
import { type Drop, Mob, type Player, type Replicated } from "./entities";
import { tickMob } from "./mob-ai";
import type { World } from "./world";

// Input budget: +1 step per tick, up to 3 saved for network jitter, so a client never moves faster than
// one step per server tick on average (server-design §4.3: speed check).
const BURST = 3;
const MAX_QUEUE = 12; // older inputs are dropped
const IDLE_AFTER_TICKS = 10; // no input for 0.5 s: let gravity settle the body

const cellOf = (x: number, y: number) => [Math.floor(x / AOI_CELL), Math.floor((y - 1) / AOI_CELL)] as const;
const pos = (e: Replicated | Drop): { x: number; y: number } =>
  "body" in e ? (e as Player).body : (e as { x: number; y: number });

interface SpawnSlot {
  def: SpawnDef;
  alive: number;
  respawnAt: number[];
}
export interface Shot {
  mob: Mob;
  x: number;
  y: number;
  vx: number;
  left: number;
}

/** A private copy of a map (step B4): a dungeon run (maps §6) or the ceremony hall (quests §4). */
export interface Instance {
  kind: "DUNGEON" | "CEREMONY";
  ownerId: number;
  /** where players go when they leave, time out or fall */
  entry: { mapId: string; x: number; y: number };
  /** world.now when the dungeon clock runs out */
  endsAt: number;
  scale: { hp: number; atk: number; reward: number };
  dungeon?: Dungeon;
  boss: Mob | null;
  bossDown: boolean;
  chest: { x: number; y: number } | null;
  /** players who opened the chest */
  opened: Set<number>;
  /** unique id of this run (ledger key of the chest) */
  runId?: string;
}

/** One public copy of a map: players, monsters, drops (docs/architecture/server-design.md §2-3). */
export class Zone {
  readonly players = new Map<number, Player>();
  readonly mobs = new Map<number, Mob>();
  readonly drops = new Map<number, Drop>();
  readonly shots: Shot[] = [];
  readonly pshots: PlayerShot[] = [];
  private readonly slots: SpawnSlot[];

  constructor(
    readonly world: World,
    readonly map: GameMap,
    readonly zoneNo: number,
    readonly collision: CollisionMap,
    readonly cap: number,
    readonly inst: Instance | null = null,
  ) {
    this.slots = map.mobSpawns.map((def) => ({ def, alive: 0, respawnAt: [] }));
    for (const s of this.slots) for (let i = 0; i < s.def.count; i++) this.spawnMob(s, 0);
  }

  get key(): string {
    return `${this.map.id}#${this.zoneNo}`;
  }
  get mapId(): string {
    return this.map.id;
  }

  /** Feet y of the first surface at or below (x, fromY), or null. */
  surfaceBelow(x: number, fromY: number): number | null {
    const c = Math.floor(x / TILE);
    for (let r = Math.max(0, Math.floor(fromY / TILE)); r < this.collision.height; r++) {
      const t = tileAt(this.collision, c, r);
      if (t === Tile.SOLID || t === Tile.ONE_WAY) return r * TILE;
    }
    return null;
  }

  private spawnMob(s: SpawnSlot, now: number): void {
    const w = this.world;
    const def = w.content.monsters.get(s.def.mob);
    if (!def) return;
    const band = s.def.level ?? def.level;
    const lv = band[0] + Math.floor(w.rng() * (band[1] - band[0] + 1));
    const leaderAlive = [...this.mobs.values()].some((m) => m.tier === "leader");
    const tier = rollTier(w.rng, leaderAlive);
    let x = Math.round(s.def.x + (w.rng() * 2 - 1) * s.def.radius * 0.8);
    let y: number | null;
    if (def.ai.flying) y = Math.round(s.def.y - 40 - w.rng() * 40);
    else {
      y = this.surfaceBelow(x, s.def.y - 40);
      if (y === null) {
        x = Math.round(s.def.x);
        y = this.surfaceBelow(x, s.def.y - 40) ?? s.def.y;
      }
    }
    const st = mobStats(lv, tier);
    const k = this.inst?.scale; // dungeon party scaling (maps §6.1)
    const max = k
      ? {
          hp: Math.round(st.hp * k.hp),
          atk: Math.round(st.atk * k.atk),
          def: st.def,
          exp: Math.round(st.exp * k.reward),
        }
      : st;
    const mob = new Mob(w.nextId(), def, s.def, w.content.text(def.nameKey), lv, tier, max, x, y, now);
    this.mobs.set(mob.id, mob);
    s.alive++;
    if (tier === "leader" && now > 0)
      this.chatAll("SYSTEM", `Thủ lĩnh ${mob.name} Lv${lv} xuất hiện ở ${w.content.text(this.map.nameKey)}!`);
  }

  /** A monster died: free its slot and schedule the respawn (combat §5.2: 8-20 s by area). */
  mobGone(m: Mob, now: number): void {
    this.mobs.delete(m.id);
    const s = this.slots.find((x) => x.def === m.spawn);
    if (!s) return;
    s.alive--;
    if (!this.inst && s.def.respawnSec > 0) s.respawnAt.push(now + s.def.respawnSec * 1000); // dungeons: no respawn
  }

  chatAll(channel: "MAP" | "SYSTEM", text: string, from?: Player): void {
    const msg = { channel, fromId: from?.id ?? 0, fromName: from?.name ?? "", text, time: Date.now() };
    for (const p of this.players.values()) p.out.send(Op.S_CHAT_MSG, msg);
  }

  /** Players who currently see entity `id` (or are it). */
  *observers(id: number): Iterable<Player> {
    for (const p of this.players.values()) if (p.id === id || p.visible.has(id)) yield p;
  }
  sendAbout(id: number, op: number, payload: unknown, also?: Player): void {
    for (const p of this.observers(id)) if (p !== also) p.out.send(op, payload);
    also?.out.send(op, payload);
  }

  sees(obs: Player, e: Replicated | Drop): boolean {
    const a = cellOf(obs.body.x, obs.body.y),
      p = pos(e),
      b = cellOf(p.x, p.y);
    return Math.abs(a[0] - b[0]) <= 1 && Math.abs(a[1] - b[1]) <= 1;
  }

  private settle(b: Body): Body {
    for (let i = 0; i < 60 && !b.ground; i++) b = step(this.collision, b, { dir: 0, jump: false, down: false });
    return b;
  }

  /** Put a player into this zone at (x, y). Returns what the player sees right away. */
  add(p: Player, x: number, y: number): { entities: EntitySpawn[]; drops: SDropSpawn[] } {
    p.zone = this;
    p.inputs.length = 0;
    p.skillQueue.length = 0;
    p.body = this.settle({ x, y, vy: 0, ground: false, drop: 0, facing: p.body.facing, climb: false });
    p.visible.clear();
    p.sent.clear();
    this.players.set(p.id, p);
    const now = this.world.now;
    const entities: EntitySpawn[] = [];
    for (const e of [...this.players.values(), ...this.mobs.values()]) {
      if (e === p || !this.sees(p, e)) continue;
      p.visible.add(e.id);
      e.sent.set(p.id, e.state());
      entities.push(e.spawnInfo());
      if (e.kind === "player" && this.sees(e, p)) {
        e.visible.add(p.id);
        p.sent.set(e.id, p.state());
        e.out.send(Op.S_ENTITY_SPAWN, p.spawnInfo());
      }
    }
    const drops: SDropSpawn[] = [];
    for (const d of this.drops.values())
      if (this.sees(p, d)) {
        p.visible.add(d.id);
        drops.push(d.info(now, p.bag.summary(d.loot)));
      }
    p.sent.set(p.id, p.state());
    p.ackSent = p.ack;
    return { entities, drops };
  }

  remove(p: Player): void {
    if (!this.players.delete(p.id)) return;
    for (const o of this.players.values()) {
      if (o.visible.delete(p.id)) o.out.send(Op.S_ENTITY_DESPAWN, { ids: [p.id] });
      o.sent.delete(p.id);
    }
    for (const m of this.mobs.values()) {
      m.sent.delete(p.id);
      if (m.targetId === p.id) m.targetId = 0;
      m.threat.delete(p.id);
    }
    p.zone = null;
  }

  queueInput(p: Player, inp: CMoveInput): void {
    if (inp.seq <= p.ack || p.inputs.some((i) => i.seq === inp.seq)) return;
    p.inputs.push(inp);
    if (p.inputs.length > MAX_QUEUE) p.inputs.splice(0, p.inputs.length - MAX_QUEUE);
  }

  /** One server tick (server-design §2): input + movement, skills, AI, status, spawns, drops. */
  update(now: number): void {
    for (const p of this.players.values()) this.move(p);
    for (const p of this.players.values()) runSkills(this, p, now);
    if (this.players.size) {
      for (const m of [...this.mobs.values()]) {
        if (m.boss) tickBoss(this, m, now);
        else tickMob(this, m, now);
        this.tickBurn(m, now);
      }
      this.tickShots(now);
      this.tickPlayerShots(now);
      if (this.inst) this.tickInstance(now);
    }
    for (const p of [...this.players.values()]) tickPlayerStatus(this, p, now);
    for (const s of this.slots)
      for (let i = s.respawnAt.length - 1; i >= 0; i--)
        if (now >= s.respawnAt[i]!) {
          s.respawnAt.splice(i, 1);
          this.spawnMob(s, now);
        }
    for (const d of this.drops.values()) if (now >= d.expiresAt) this.drops.delete(d.id);
  }

  private move(p: Player): void {
    p.inputs.sort((a, b) => a.seq - b.seq);
    p.budget = Math.min(BURST, p.budget + 1);
    const batch = p.inputs.splice(0, Math.floor(p.budget));
    p.budget -= batch.length;
    if (batch.length === 0) {
      if (++p.quietTicks >= IDLE_AFTER_TICKS && !p.body.ground && !p.body.climb)
        p.body = step(this.collision, p.body, { dir: 0, jump: false, down: false });
      return;
    }
    p.quietTicks = 0;
    for (const inp of batch) {
      p.ack = inp.seq;
      if (!p.alive) continue; // the dead do not move, their inputs are still acknowledged
      p.dir = inp.dir;
      const was = p.body;
      p.body = step(this.collision, p.body, {
        dir: inp.dir,
        jump: inp.jump === 1,
        down: inp.down === 1,
        up: inp.up === 1,
      });
      if (p.body.hazard && !was.hazard) p.hazardHit = true;
    }
  }

  private tickShots(now: number): void {
    const dt = 0.05;
    for (let i = this.shots.length - 1; i >= 0; i--) {
      const s = this.shots[i]!;
      const stepX = s.vx * dt;
      s.x += stepX;
      s.left -= Math.abs(stepX);
      let hit: Player | undefined;
      for (const p of this.players.values())
        if (p.alive && Math.abs(p.body.x - s.x) < 16 && Math.abs(p.body.y - 24 - s.y) < 40) hit = p;
      const wall = tileAt(this.collision, Math.floor(s.x / TILE), Math.floor(s.y / TILE)) === Tile.SOLID;
      if (hit) mobAttackLands(this, s.mob, hit, now);
      if (hit || wall || s.left <= 0) this.shots.splice(i, 1);
    }
  }

  private tickBurn(m: Mob, now: number): void {
    const b = m.burn;
    if (!b || !m.alive || now < b.next) return;
    b.next += 1000;
    const p = this.players.get(b.by);
    if (now > b.until || !p) m.burn = null;
    else hitMob(this, p, m, 1, now, { dot: b.dmg });
  }

  private tickPlayerShots(now: number): void {
    const dt = 0.05;
    for (let i = this.pshots.length - 1; i >= 0; i--) {
      const s = this.pshots[i]!;
      const stepX = s.vx * dt;
      s.x += stepX;
      s.left -= Math.abs(stepX);
      let hit: Mob | undefined,
        best = Infinity;
      for (const m of this.mobs.values()) {
        if (!m.alive || m.boss?.torn) continue;
        const [x0, y0, x1, y1] = mobHitBox(m);
        const d = Math.abs(m.x - (s.x - stepX)); // the first monster on the way
        if (s.x >= x0 - 10 && s.x <= x1 + 10 && s.y >= y0 - 30 && s.y <= y1 + 30 && d < best) [hit, best] = [m, d];
      }
      const wall = tileAt(this.collision, Math.floor(s.x / TILE), Math.floor(s.y / TILE)) === Tile.SOLID;
      if (hit) shotLands(this, s, hit, now);
      if (hit || wall || s.left <= 0) this.pshots.splice(i, 1);
    }
  }

  /** Dungeon: the boss wakes when someone comes close; the clock throws everyone out (maps §6.2). */
  private tickInstance(now: number): void {
    const inst = this.inst!,
      dg = inst.dungeon;
    if (!dg) return;
    if (!inst.boss && !inst.bossDown) {
      const at = this.map.bossSpawns.find((b) => b.boss === dg.boss);
      if (at && [...this.players.values()].some((p) => p.alive && Math.abs(p.body.x - at.x) < dg.wakeRange)) {
        inst.boss = spawnBoss(this, this.world.content.bosses.get(dg.boss)!, at, "DUNGEON", inst.scale);
        this.chatAll("SYSTEM", this.world.content.text("boss_msg.wake"));
      }
    }
    if (now >= inst.endsAt)
      for (const p of [...this.players.values()]) {
        p.out.send(Op.S_CHAT_MSG, {
          channel: "SYSTEM",
          fromId: 0,
          fromName: "",
          text: this.world.content.text("boss_msg.dg_timeout"),
          time: Date.now(),
        });
        this.world.leaveInstance(p);
      }
  }

  /** S_BOSS_STATE to everyone in the zone (the boss bar and its telegraphs). */
  bossState(m: Mob, over = false, telegraphs?: Telegraph[]): void {
    const run = m.boss;
    if (!run) return;
    const pieces = run.torn ? run.pieces.filter((x) => x.alive) : null;
    const hp = pieces ? pieces.reduce((a, x) => a + Math.max(0, x.hp), 0) : m.hp;
    const max = pieces ? run.piecesMax || 1 : m.max.hp;
    const st: SBossState = {
      id: m.id,
      name: m.name,
      lv: m.lv,
      hpPct: Math.max(0, Math.min(1, hp / max)),
      phase: run.phasesDone.size,
      enraged: run.enraged,
      ...(pieces ? { pieces: pieces.length } : {}),
      ...(telegraphs ? { telegraphs } : {}),
      ...(over ? { over: true } : {}),
    };
    for (const p of this.players.values()) p.out.send(Op.S_BOSS_STATE, st);
  }

  /** The class look changed: everyone who sees the player gets the new spawn info. */
  respawnLook(p: Player): void {
    const info = p.spawnInfo();
    for (const o of this.players.values()) if (o !== p && o.visible.has(p.id)) o.out.send(Op.S_ENTITY_SPAWN, info);
  }

  /** Trang Lạc is down (maps §6.2): the Rương Tân Thủ appears where it fell. */
  dungeonBossDown(boss: Mob): void {
    const inst = this.inst;
    if (!inst) return;
    inst.bossDown = true;
    inst.chest = { x: Math.round(boss.x), y: this.surfaceBelow(boss.x, boss.y - 40) ?? boss.y };
    this.chatAll("SYSTEM", this.world.content.text("boss_msg.dg_down"));
    for (const p of this.players.values()) p.out.send(Op.S_INSTANCE_STATE, this.instanceState(p));
  }

  instanceState(p: Player): SInstanceState {
    const inst = this.inst!;
    const st: SInstanceState = { mapId: this.mapId, kind: inst.kind };
    if (inst.kind === "DUNGEON") {
      st.leftMs = Math.max(0, inst.endsAt - this.world.now);
      st.bossDown = inst.bossDown;
      if (inst.chest) st.chest = { ...inst.chest, opened: inst.opened.has(p.id) };
    } else st.altar = { x: 496, y: 352 };
    return st;
  }

  /** 9. replication: AOI spawn/despawn and delta snapshots (server-design §5). */
  replicate(): void {
    const now = this.world.now;
    const ents: Replicated[] = [...this.players.values(), ...this.mobs.values()];
    for (const obs of this.players.values()) {
      const gone: number[] = [];
      for (const id of obs.visible) {
        const e = this.players.get(id) ?? this.mobs.get(id) ?? this.drops.get(id);
        if (!e || !this.sees(obs, e)) {
          obs.visible.delete(id);
          if (e && "sent" in e) e.sent.delete(obs.id);
          gone.push(id);
        }
      }
      const deltas: EntityDelta[] = [];
      for (const e of ents) {
        if (e !== obs && !obs.visible.has(e.id)) {
          if (!this.sees(obs, e)) continue;
          obs.visible.add(e.id);
          obs.out.send(Op.S_ENTITY_SPAWN, e.spawnInfo());
          e.sent.set(obs.id, e.state());
          continue;
        }
        const cur = e.state(),
          last = e.sent.get(obs.id);
        const d: EntityDelta = { id: e.id };
        if (!last || last.x !== cur.x) d.x = cur.x;
        if (!last || last.y !== cur.y) d.y = cur.y;
        if (!last || last.vy !== cur.vy) d.vy = cur.vy;
        if (!last || last.st !== cur.st) d.st = cur.st;
        if (!last || last.f !== cur.f) d.f = cur.f;
        if (!last || last.hp !== cur.hp) d.hp = cur.hp;
        if (Object.keys(d).length > 1) {
          deltas.push(d);
          e.sent.set(obs.id, cur);
        }
      }
      for (const d of this.drops.values())
        if (!obs.visible.has(d.id) && this.sees(obs, d)) {
          obs.visible.add(d.id);
          obs.out.send(Op.S_DROP_SPAWN, d.info(now, obs.bag.summary(d.loot)));
        }
      if (gone.length) obs.out.send(Op.S_ENTITY_DESPAWN, { ids: gone });
      if (deltas.length || obs.ack !== obs.ackSent) {
        obs.out.send(Op.S_SNAPSHOT, { tick: this.world.tick, ack: obs.ack, ents: deltas });
        obs.ackSent = obs.ack;
      }
    }
  }

  /** Monster template counts for tests and logs. */
  get mobCount(): number {
    return this.mobs.size;
  }
  static readonly zonesPerMap = RULES.zonesPerMap;
}

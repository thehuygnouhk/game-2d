import type { Content, MobSpawn as SpawnDef, Monster } from "@htk/content";
import {
  type Appearance,
  type Body,
  type CMoveInput,
  type CUseSkill,
  combatPower,
  type EntitySpawn,
  expToNext,
  hpByte,
  type Loot,
  makeBody,
  type MobSpawn,
  MoveState,
  moveState,
  PASSIVE,
  type PlayerSpawn,
  type PlayerStats,
  playerStats,
  type SDropSpawn,
  type Points,
  type StatsFull,
  START_POINTS,
  type Tier,
} from "@htk/shared";
import { randomUUID } from "node:crypto";
import { Bag } from "./bag";
import type { Store } from "./store";
import type { Zone } from "./zone";

export interface Outbox {
  send(op: number, payload: unknown): void;
}
/** What an observer last received about an entity (delta snapshots, server-design §5.1). */
export type Shown = { x: number; y: number; vy: number; st: number; f: 1 | -1; hp: number };

export interface Replicated {
  readonly id: number;
  readonly sent: Map<number, Shown>;
  state(): Shown;
  spawnInfo(): EntitySpawn;
  alive: boolean;
}

export class Player implements Replicated {
  readonly kind = "player";
  readonly inputs: CMoveInput[] = [];
  readonly skillQueue: { cmd: CUseSkill; at: number; refSeq: number }[] = [];
  body: Body;
  dir: -1 | 0 | 1 = 0;
  ack = 0;
  quietTicks = 0;
  budget = 3;
  readonly sent = new Map<number, Shown>();
  readonly visible = new Set<number>();
  ackSent = -1;
  zone: Zone | null = null;

  lv = 1;
  exp = 0;
  stats!: PlayerStats;
  hp = 0;
  mp = 0;
  alive = true;
  diedAt = 0;
  lastCombat = -1e9;
  invulnUntil = 0;
  readonly cds = new Map<string, number>();
  gcdUntil = 0;
  rallyUntil = 0;
  rallyCdUntil = 0;
  hazardCdUntil = 0;
  /** feet touched a hazard tile during this tick */
  hazardHit = false;
  hpRegenAt = 0;
  potionCd = { hp: 0, mp: 0 };
  lastChat = -1e9;
  lastWorldChat = -1e9;
  /** vitals last sent with S_STATS_UPDATE */
  shownVitals = { hp: -1, mp: -1, exp: -1 };
  readonly bag: Bag;
  /** potential points spent per stat, and still free (combat §3.3) */
  pts: Points = { hp: 0, mp: 0, atk: 0, def: 0, crit: 0 };
  statPoints = START_POINTS;
  /** points granted by level-ups not yet written to the database */
  pendingPoints = 0;
  /** account and character ids (accounts, step B3); unset for development guests */
  accountId?: string;
  characterId?: string;
  /** last zone, kept for the save after leaving; town map to save while fallen */
  lastZone: Zone | null = null;
  townMap?: string;
  playMark = Date.now();
  /** per-character queue: asset changes run one at a time, in order (server-design §7.1) */
  private chain: Promise<unknown> = Promise.resolve();

  constructor(
    readonly id: number,
    readonly name: string,
    readonly appearance: Appearance,
    readonly out: Outbox,
    private readonly content: Content,
    readonly store: Store,
  ) {
    this.body = makeBody(0, 0);
    this.bag = new Bag(content);
    this.recompute(true);
  }

  /** Run `fn` after every queued asset operation of this character. */
  enqueue<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.chain.then(fn, fn);
    this.chain = run.catch(() => undefined);
    return run;
  }
  /** resolves when every queued operation has finished */
  get idle(): Promise<unknown> {
    return this.chain;
  }

  /** Stats from origin, level and the potential points spent (combat §3.3-3.4). */
  recompute(refill = false): void {
    const o = this.content.origins[this.appearance.origin];
    const base = playerStats(this.lv, o, this.pts);
    this.stats = base;
    if (refill) {
      this.hp = base.hp;
      this.mp = base.mp;
    }
    this.hp = Math.min(this.hp, base.hp);
    this.mp = Math.min(this.mp, base.mp);
  }

  /** ATK and DEF with Không Lùi Bước (Dân Làng) while it is on. */
  combatStats(now: number): PlayerStats {
    if (now >= this.rallyUntil) return this.stats;
    const k = 1 + PASSIVE.rally.bonus;
    return { ...this.stats, atk: Math.round(this.stats.atk * k), def: Math.round(this.stats.def * k) };
  }

  full(now: number): StatsFull {
    const s = this.combatStats(now);
    return {
      lv: this.lv,
      exp: this.exp,
      expNext: expToNext(this.lv),
      hp: Math.ceil(this.hp),
      mp: Math.floor(this.mp),
      maxHp: s.hp,
      maxMp: s.mp,
      atk: s.atk,
      def: s.def,
      crit: s.crit,
      power: combatPower(s, this.lv >= 5 ? 2 : 1),
      statPoints: this.statPoints,
      pts: { ...this.pts },
    };
  }

  state(): Shown {
    return {
      x: this.body.x,
      y: this.body.y,
      vy: this.body.vy,
      st: this.alive ? moveState(this.body, this.dir) : MoveState.DEAD,
      f: this.body.facing,
      hp: hpByte(this.hp, this.stats.hp),
    };
  }

  spawnInfo(): PlayerSpawn {
    const s = this.state();
    return {
      id: this.id,
      kind: "player",
      name: this.name,
      appearance: this.appearance,
      lv: this.lv,
      x: s.x,
      y: s.y,
      st: s.st,
      f: s.f,
      hp: s.hp,
    };
  }
}

export type MobMode = "idle" | "chase" | "return" | "flee";

export class Mob implements Replicated {
  readonly kind = "mob";
  readonly sent = new Map<number, Shown>();
  alive = true;
  hp: number;
  x: number;
  y: number;
  facing: 1 | -1 = 1;
  moving = false;
  mode: MobMode = "idle";
  walking = false;
  wanderDir: 1 | -1 = 1;
  nextThink: number;
  targetId = 0;
  /** damage dealt by each player: threat (server-design §6.3) and the share of the kill (combat §2.3) */
  readonly threat = new Map<number, number>();
  atkReadyAt = 0;
  windup: { at: number; targetId: number } | null = null;
  hurtUntil = 0;
  knockDir: 1 | -1 = 1;
  hoverY: number;

  constructor(
    readonly id: number,
    readonly def: Monster,
    readonly spawn: SpawnDef,
    readonly name: string,
    readonly lv: number,
    readonly tier: Tier,
    readonly max: { hp: number; atk: number; def: number; exp: number },
    readonly homeX: number,
    readonly homeY: number,
    now: number,
  ) {
    this.hp = max.hp;
    this.x = homeX;
    this.y = homeY;
    this.hoverY = homeY;
    this.nextThink = now + 500;
  }

  get flying(): boolean {
    return this.def.ai.flying;
  }
  get w(): number {
    return this.def.size.w;
  }
  get h(): number {
    return this.def.size.h;
  }

  state(): Shown {
    return {
      x: Math.round(this.x),
      y: Math.round(this.y),
      vy: 0,
      st: this.alive ? (this.moving ? MoveState.RUN : MoveState.IDLE) : MoveState.DEAD,
      f: this.facing,
      hp: hpByte(this.hp, this.max.hp),
    };
  }

  spawnInfo(): MobSpawn {
    const s = this.state();
    return {
      id: this.id,
      kind: "mob",
      templateId: this.def.id,
      name: this.name,
      lv: this.lv,
      tier: this.tier,
      flying: this.flying,
      x: s.x,
      y: s.y,
      st: s.st,
      f: s.f,
      hp: s.hp,
    };
  }
}

export class Drop {
  readonly kind = "drop";
  /** idemKey of the pickup: one ledger row per drop, ever (database-schema §6) */
  readonly key = randomUUID();
  constructor(
    readonly id: number,
    readonly loot: Loot,
    readonly x: number,
    readonly y: number,
    readonly ownerId: number,
    readonly lockedUntil: number,
    readonly expiresAt: number,
  ) {}

  info(now: number, summary: SDropSpawn["what"]): SDropSpawn {
    return {
      id: this.id,
      x: this.x,
      y: this.y,
      what: summary,
      ownerId: this.ownerId,
      lockedMs: Math.max(0, this.lockedUntil - now),
    };
  }
}

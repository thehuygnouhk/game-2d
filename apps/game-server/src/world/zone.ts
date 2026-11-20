import {
  AOI_CELL,
  type Appearance,
  type Body,
  type CMoveInput,
  type CollisionMap,
  type EntityDelta,
  type EntitySpawn,
  makeBody,
  moveState,
  Op,
  type SEnterWorld,
  step,
} from "@htk/shared";

export interface Outbox {
  send(op: number, payload: unknown): void;
}

// Input budget: +1 step per tick, up to 3 saved for network jitter, so a client never moves faster than
// one step per server tick on average (server-design §4.3: speed check).
const BURST = 3;
const MAX_QUEUE = 12; // older inputs are dropped
type Shown = { x: number; y: number; vy: number; st: number; f: 1 | -1 };
const IDLE_AFTER_TICKS = 10; // no input for 0.5 s: let gravity settle the body

export class Player {
  readonly inputs: CMoveInput[] = [];
  body: Body;
  dir: -1 | 0 | 1 = 0;
  ack = 0;
  quietTicks = 0;
  /** what each observer last received about this entity */
  readonly sent = new Map<number, Shown>();
  budget = BURST;
  readonly visible = new Set<number>();
  ackSent = -1;

  constructor(
    readonly id: number,
    readonly name: string,
    readonly appearance: Appearance,
    readonly out: Outbox,
    spawn: { x: number; y: number },
  ) {
    this.body = makeBody(spawn.x, spawn.y);
  }

  state(): Shown {
    return {
      x: this.body.x,
      y: this.body.y,
      vy: this.body.vy,
      st: moveState(this.body, this.dir),
      f: this.body.facing,
    };
  }

  spawnInfo(): EntitySpawn {
    const s = this.state();
    return {
      id: this.id,
      kind: "player",
      name: this.name,
      appearance: this.appearance,
      x: s.x,
      y: s.y,
      st: s.st,
      f: s.f,
    };
  }
}

const cell = (p: Player) => [Math.floor(p.body.x / AOI_CELL), Math.floor((p.body.y - 1) / AOI_CELL)] as const;

/** One public copy of a map (docs/architecture/server-design.md §3). */
export class Zone {
  readonly players = new Map<number, Player>();
  tick = 0;

  constructor(
    readonly mapId: string,
    readonly zoneNo: number,
    readonly collision: CollisionMap,
    readonly spawn: { x: number; y: number },
  ) {}

  /** Settle a fresh body on the ground below the spawn point. */
  private settle(b: Body): Body {
    for (let i = 0; i < 60 && !b.ground; i++) b = step(this.collision, b, { dir: 0, jump: false, down: false });
    return b;
  }

  sees(a: Player, b: Player): boolean {
    const [ax, ay] = cell(a),
      [bx, by] = cell(b);
    return Math.abs(ax - bx) <= 1 && Math.abs(ay - by) <= 1;
  }

  add(p: Player): void {
    p.body = this.settle(p.body);
    this.players.set(p.id, p);
    const others = [...this.players.values()].filter((o) => o !== p && this.sees(p, o));
    for (const o of others) {
      p.visible.add(o.id);
      o.sent.set(p.id, o.state());
      o.visible.add(p.id);
      p.sent.set(o.id, p.state());
      o.out.send(Op.S_ENTITY_SPAWN, p.spawnInfo());
    }
    const s = p.state();
    const welcome: SEnterWorld = {
      you: p.id,
      character: { name: p.name, appearance: p.appearance },
      map: { id: this.mapId, zone: this.zoneNo },
      tick: this.tick,
      body: { x: s.x, y: s.y, vy: s.vy, st: s.st },
      entities: others.map((o) => o.spawnInfo()),
    };
    p.sent.set(p.id, s);
    p.out.send(Op.S_ENTER_WORLD, welcome);
  }

  remove(p: Player): void {
    if (!this.players.delete(p.id)) return;
    for (const o of this.players.values()) {
      if (o.visible.delete(p.id)) {
        o.out.send(Op.S_ENTITY_DESPAWN, { ids: [p.id] });
      }
      p.sent.delete(o.id);
      o.sent.delete(p.id);
    }
  }

  queueInput(p: Player, inp: CMoveInput): void {
    if (inp.seq <= p.ack || p.inputs.some((i) => i.seq === inp.seq)) return;
    p.inputs.push(inp);
    if (p.inputs.length > MAX_QUEUE) p.inputs.splice(0, p.inputs.length - MAX_QUEUE);
  }

  /** 1. net input + 2. movement (server-design §2). */
  update(): void {
    this.tick++;
    for (const p of this.players.values()) {
      p.inputs.sort((a, b) => a.seq - b.seq);
      p.budget = Math.min(BURST, p.budget + 1);
      const batch = p.inputs.splice(0, Math.floor(p.budget));
      p.budget -= batch.length;
      if (batch.length === 0) {
        if (++p.quietTicks >= IDLE_AFTER_TICKS && !p.body.ground)
          p.body = step(this.collision, p.body, { dir: 0, jump: false, down: false });
        continue;
      }
      p.quietTicks = 0;
      for (const inp of batch) {
        p.dir = inp.dir;
        p.body = step(this.collision, p.body, { dir: inp.dir, jump: inp.jump === 1, down: inp.down === 1 });
        p.ack = inp.seq;
      }
    }
  }

  /** 9. replication: AOI spawn/despawn and delta snapshots (server-design §5). */
  replicate(): void {
    const all = [...this.players.values()];
    for (const obs of all) {
      const gone: number[] = [];
      const ents: EntityDelta[] = [];
      for (const p of all) {
        const inView = p === obs || this.sees(obs, p);
        if (p !== obs && inView && !obs.visible.has(p.id)) {
          obs.visible.add(p.id);
          obs.out.send(Op.S_ENTITY_SPAWN, p.spawnInfo());
          p.sent.set(obs.id, p.state());
          continue;
        }
        if (p !== obs && !inView && obs.visible.delete(p.id)) {
          gone.push(p.id);
          p.sent.delete(obs.id);
          continue;
        }
        if (!inView) continue;
        const now = p.state(),
          last = p.sent.get(obs.id);
        const d: EntityDelta = { id: p.id };
        if (!last || last.x !== now.x) d.x = now.x;
        if (!last || last.y !== now.y) d.y = now.y;
        if (!last || last.vy !== now.vy) d.vy = now.vy;
        if (!last || last.st !== now.st) d.st = now.st;
        if (!last || last.f !== now.f) d.f = now.f;
        const changed = Object.keys(d).length > 1;
        if (changed) {
          ents.push(d);
          p.sent.set(obs.id, now);
        }
      }
      if (gone.length) obs.out.send(Op.S_ENTITY_DESPAWN, { ids: gone });
      if (ents.length || obs.ack !== obs.ackSent) {
        obs.out.send(Op.S_SNAPSHOT, { tick: this.tick, ack: obs.ack, ents });
        obs.ackSent = obs.ack;
      }
    }
  }
}

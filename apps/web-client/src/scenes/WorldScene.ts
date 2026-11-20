import Phaser from "phaser";
import {
  type Appearance,
  type Body,
  collisionFromTiled,
  type CollisionMap,
  type EntityDelta,
  type EntitySpawn,
  type MoveInput,
  Op,
  type SEnterWorld,
  type SSnapshot,
  TICK_MS,
  type TiledMap,
} from "@htk/shared";
import type { Connection } from "../net/connection";
import { Predictor } from "../world/prediction";
import { RemoteTrack } from "../world/remote";

const ORIGINS = ["VILLAGER", "NOBLE", "ANCIENT"] as const;
const GENDERS = ["MALE", "FEMALE"] as const;
const lookKey = (a: Appearance) => `p_${a.origin}_${a.gender}_novice`.toLowerCase();
const FALL_FRAME = 14;

interface Remote {
  id: number;
  name: string;
  spr: Phaser.GameObjects.Sprite;
  label: Phaser.GameObjects.Text;
  track: RemoteTrack;
  last: Required<Pick<EntityDelta, "x" | "y" | "st" | "f">>;
  key: string;
}

/** Gameplay scene for step B1: M001 zone 1, local prediction, remote interpolation. */
export class WorldScene extends Phaser.Scene {
  private net!: Connection;
  private enter!: SEnterWorld;
  private coll!: CollisionMap;
  private me!: Predictor;
  private meSpr!: Phaser.GameObjects.Sprite;
  private meLabel!: Phaser.GameObjects.Text;
  private serverSelf: { x: number; y: number; vy: number; st: number; f: 1 | -1 } = { x: 0, y: 0, vy: 0, st: 0, f: 1 };
  private readonly remotes = new Map<number, Remote>();
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private acc = 0;
  private lastWall = 0;
  private inputSeq = 0;
  private tickClient = 0;
  lastError = 0;

  constructor() {
    super("world");
  }

  init(data: { net: Connection; enter: SEnterWorld }): void {
    this.net = data.net;
    this.enter = data.enter;
  }

  preload(): void {
    const m = this.enter.map.id.toLowerCase();
    this.load.tilemapTiledJSON(m, `maps/${m}.tmj`);
    for (const k of ["far", "mid", "near"]) this.load.image(`${m}_${k}`, `maps/backgrounds/${m}_${k}.png`);
    this.load.image("r01", "maps/tilesets/r01.png");
    this.load.image("collision", "maps/tilesets/collision.png");
    for (const o of ORIGINS)
      for (const g of GENDERS) {
        const key = lookKey({ origin: o, gender: g });
        this.load.spritesheet(key, `sprites/player/${key.slice(2)}.png`, { frameWidth: 96, frameHeight: 96 });
      }
  }

  create(): void {
    const id = this.enter.map.id.toLowerCase();
    const map = this.make.tilemap({ key: id });
    const W = map.widthInPixels,
      H = map.heightInPixels;
    [
      ["far", 0.1],
      ["mid", 0.35],
      ["near", 0.6],
    ].forEach(([k, f]) =>
      this.add
        .tileSprite(0, 0, W, H, `${id}_${k}`)
        .setOrigin(0, 0)
        .setScrollFactor(f as number, 1),
    );
    const ts = map.addTilesetImage("r01", "r01")!;
    map.createLayer("ground", ts, 0, 0)?.setDepth(2);
    map.createLayer("decor", ts, 0, 0)?.setDepth(3);
    map.createLayer("fg", ts, 0, 0)?.setDepth(30);
    this.coll = collisionFromTiled(this.cache.tilemap.get(id).data as TiledMap);
    this.cameras.main.setBounds(0, 0, W, H);
    this.makeAnims();

    const b = this.enter.body;
    const start: Body = { x: b.x, y: b.y, vy: b.vy, ground: b.st < 2, drop: 0, facing: 1 };
    this.serverSelf = { ...b, f: 1 };
    this.me = new Predictor(this.coll, start);
    const key = lookKey(this.enter.character.appearance);
    this.meSpr = this.add
      .sprite(b.x, b.y - 44, key)
      .setDepth(20)
      .play(`${key}_idle`);
    this.meLabel = this.label(this.enter.character.name, "#ffe08a");
    this.cameras.main.startFollow(this.meSpr, true, 0.15, 0.15);
    for (const e of this.enter.entities) this.addRemote(e);

    const K = Phaser.Input.Keyboard.KeyCodes;
    this.keys = this.input.keyboard!.addKeys({
      a: K.A,
      d: K.D,
      l: K.LEFT,
      r: K.RIGHT,
      w: K.W,
      up: K.UP,
      sp: K.SPACE,
      s: K.S,
      dn: K.DOWN,
    }) as Record<string, Phaser.Input.Keyboard.Key>;
    this.input.keyboard!.addCapture("SPACE,UP,DOWN,LEFT,RIGHT");

    this.net.on<EntitySpawn>(Op.S_ENTITY_SPAWN, (e) => this.addRemote(e));
    this.net.on<{ ids: number[] }>(Op.S_ENTITY_DESPAWN, (p) => p.ids.forEach((i) => this.removeRemote(i)));
    this.net.on<SSnapshot>(Op.S_SNAPSHOT, (s) => this.onSnapshot(s));
    (window as unknown as { __htk: unknown }).__htk = { scene: this };
  }

  private label(text: string, color: string): Phaser.GameObjects.Text {
    return this.add
      .text(0, 0, text, {
        fontFamily: "system-ui, sans-serif",
        fontSize: "13px",
        fontStyle: "bold",
        color,
        stroke: "#120e1a",
        strokeThickness: 4,
      })
      .setOrigin(0.5, 1)
      .setDepth(40);
  }

  private makeAnims(): void {
    const row = (r: number, n: number) => Array.from({ length: n }, (_, i) => r * 6 + i);
    for (const o of ORIGINS)
      for (const g of GENDERS) {
        const key = lookKey({ origin: o, gender: g });
        if (this.anims.exists(`${key}_idle`)) continue;
        this.anims.create({
          key: `${key}_idle`,
          frames: this.anims.generateFrameNumbers(key, { frames: row(0, 4) }),
          frameRate: 6,
          repeat: -1,
        });
        this.anims.create({
          key: `${key}_walk`,
          frames: this.anims.generateFrameNumbers(key, { frames: row(1, 6) }),
          frameRate: 10,
          repeat: -1,
        });
      }
  }

  private addRemote(e: EntitySpawn): void {
    if (e.id === this.enter.you || this.remotes.has(e.id)) return;
    const key = lookKey(e.appearance);
    const spr = this.add
      .sprite(e.x, e.y - 44, key)
      .setDepth(19)
      .play(`${key}_idle`);
    const r: Remote = {
      id: e.id,
      name: e.name,
      spr,
      label: this.label(e.name, "#ffffff"),
      track: new RemoteTrack(),
      last: { x: e.x, y: e.y, st: e.st, f: e.f },
      key,
    };
    r.track.push({ t: performance.now(), ...r.last });
    this.remotes.set(e.id, r);
  }

  private removeRemote(id: number): void {
    const r = this.remotes.get(id);
    if (!r) return;
    r.spr.destroy();
    r.label.destroy();
    this.remotes.delete(id);
  }

  private onSnapshot(s: SSnapshot): void {
    const now = performance.now();
    for (const d of s.ents) {
      if (d.id === this.enter.you) Object.assign(this.serverSelf, d);
      else {
        const r = this.remotes.get(d.id);
        if (r) Object.assign(r.last, d);
      }
    }
    // unchanged entities are not resent: record them too, so a player who stopped is not extrapolated
    for (const r of this.remotes.values()) r.track.push({ t: now, ...r.last });
    const v = this.serverSelf;
    this.lastError = this.me.reconcile(s.ack, { x: v.x, y: v.y, vy: v.vy, ground: v.st < 2, drop: 0, facing: v.f });
  }

  private readInput(): MoveInput {
    const k = this.keys;
    const left = k.a!.isDown || k.l!.isDown,
      right = k.d!.isDown || k.r!.isDown;
    return {
      dir: left === right ? 0 : left ? -1 : 1,
      jump: k.w!.isDown || k.up!.isDown || k.sp!.isDown,
      down: k.s!.isDown || k.dn!.isDown,
    };
  }

  override update(): void {
    // Fixed 50 ms steps on the wall clock, the same as a server tick; one C_MOVE_INPUT per step (max 20/s).
    // Phaser's own delta is smoothed and capped when frames are slow, which would make the game run slow.
    const wall = performance.now(),
      dtMs = this.lastWall ? wall - this.lastWall : 0;
    this.lastWall = wall;
    this.acc = Math.min(this.acc + dtMs, TICK_MS * 10); // catch up to 0.5 s of slow frames, drop the rest
    while (this.acc >= TICK_MS) {
      this.acc -= TICK_MS;
      const inp = this.readInput();
      const seq = ++this.inputSeq;
      this.me.apply(seq, inp);
      this.net.send(Op.C_MOVE_INPUT, {
        seq,
        dir: inp.dir,
        jump: inp.jump ? 1 : 0,
        down: inp.down ? 1 : 0,
        tickClient: ++this.tickClient,
      });
    }
    const k = this.acc / TICK_MS,
      a = this.me.prev,
      b = this.me.body;
    const x = a.x + (b.x - a.x) * k,
      y = a.y + (b.y - a.y) * k;
    this.pose(
      this.meSpr,
      this.lookOf(this.enter.character.appearance),
      b.ground ? (this.readInput().dir !== 0 ? 1 : 0) : 3,
      b.facing,
      x,
      y,
    );
    this.meLabel.setPosition(x, y - 92);
    const now = performance.now();
    for (const r of this.remotes.values()) {
      const s = r.track.sample(now);
      if (!s) continue;
      this.pose(r.spr, r.key, s.st, s.f, s.x, s.y);
      r.label.setPosition(s.x, s.y - 92);
    }
  }

  private lookOf(a: Appearance): string {
    return lookKey(a);
  }

  private pose(spr: Phaser.GameObjects.Sprite, key: string, st: number, f: number, x: number, y: number): void {
    spr.setPosition(x, y - 44).setFlipX(f < 0);
    if (st >= 2) {
      spr.anims.stop();
      spr.setFrame(FALL_FRAME);
    } else spr.play(`${key}_${st === 1 ? "walk" : "idle"}`, true);
  }

  get debug() {
    return {
      you: this.enter.you,
      me: { ...this.me.body },
      unacked: this.me.unacked,
      corrections: this.me.corrections,
      remotes: [...this.remotes.values()].map((r) => ({ id: r.id, name: r.name, x: r.last.x, y: r.last.y })),
    };
  }
}

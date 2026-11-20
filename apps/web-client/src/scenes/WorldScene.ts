import Phaser from "phaser";
import {
  type Appearance,
  type Body,
  collisionFromTiled,
  type CollisionMap,
  type EntityDelta,
  type EntitySpawn,
  type MoveInput,
  MoveState,
  Op,
  RULES,
  type SDamage,
  type SDropSpawn,
  type SEntityDied,
  type SHeal,
  type SInventoryDelta,
  type SLevelUp,
  type SMapChange,
  type SSkillCast,
  type SSnapshot,
  TICK_MS,
  type TiledMap,
} from "@htk/shared";
import type { Connection } from "../net/connection";
import type { GameState } from "../state";
import type { Hud } from "../ui/hud";
import { Predictor } from "../world/prediction";
import { RemoteTrack } from "../world/remote";

const ORIGINS = ["VILLAGER", "NOBLE", "ANCIENT"] as const;
const GENDERS = ["MALE", "FEMALE"] as const;
const MOBS = ["MOB001", "MOB002", "MOB003", "MOB004", "MOB005", "MOB006", "MOB007"];
const lookKey = (a: Appearance) => `p_${a.origin}_${a.gender}_novice`.toLowerCase();
const FALL_FRAME = 14;
const RARITY_COLOR: Record<string, string> = { common: "#e8e8e8", good: "#6ee06e", rare: "#5aaeff", epic: "#c58bff" };
const RARITY_NAME: Record<string, string> = { common: "", good: " (Tốt)", rare: " (Hiếm)", epic: " (Sử Thi)" };

interface Ent {
  id: number;
  kind: "player" | "mob";
  name: string;
  lv: number;
  spr: Phaser.GameObjects.Sprite;
  label: Phaser.GameObjects.Text;
  track: RemoteTrack;
  last: { x: number; y: number; st: number; f: 1 | -1; hp: number };
  key: string; // texture key; animation prefix
  templateId?: string;
  flying?: boolean;
  scale: number;
  barUntil: number;
  actUntil: number;
  dying: boolean;
}
interface DropView {
  id: number;
  info: SDropSpawn;
  spr: Phaser.GameObjects.Sprite;
  label?: Phaser.GameObjects.Text;
  freeAt: number;
  askedAt: number;
}
interface PortalRect {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}
export interface WorldData {
  net: Connection;
  state: GameState;
  hud: Hud;
  change: SMapChange;
}

/** Gameplay scene (step B2): one map zone, local prediction, remote interpolation, combat feedback. */
export class WorldScene extends Phaser.Scene {
  private net!: Connection;
  private state!: GameState;
  private hud!: Hud;
  private change!: SMapChange;
  private coll!: CollisionMap;
  private me!: Predictor;
  private meSpr!: Phaser.GameObjects.Sprite;
  private meLabel!: Phaser.GameObjects.Text;
  private meKey = "";
  private serverSelf = { x: 0, y: 0, vy: 0, st: 0, f: 1 as 1 | -1 };
  private readonly ents = new Map<number, Ent>();
  private readonly drops = new Map<number, DropView>();
  private portals: PortalRect[] = [];
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private icons: string[] = [];
  private acc = 0;
  private lastWall = 0;
  private inputSeq = 0;
  private tickClient = 0;
  private prevUp = false;
  /** a tap shorter than one 50 ms step still counts (keydown latched until the next step) */
  private readonly latch = { up: false, jump: false };
  private portalWait = 0;
  private busyUntil = 0;
  private gcdUntil = 0;
  private msgAt = 0;
  private target: number | null = null;
  private arrow!: Phaser.GameObjects.Graphics;
  private bars!: Phaser.GameObjects.Graphics;
  private readonly unsubs: (() => void)[] = [];
  /** monsters whose kill gave this player EXP on this map (debug, e2e) */
  private readonly kills: number[] = [];
  lastError = 0;

  constructor() {
    super("world");
  }

  init(data: WorldData): void {
    this.net = data.net;
    this.state = data.state;
    this.hud = data.hud;
    this.change = data.change;
    this.ents.clear();
    this.drops.clear();
    this.kills.length = 0;
    this.target = null;
    this.acc = 0;
    this.lastWall = 0;
    this.portalWait = 0;
    this.busyUntil = 0;
  }

  preload(): void {
    const m = this.change.map.id.toLowerCase();
    if (!this.cache.tilemap.exists(m)) this.load.tilemapTiledJSON(m, `maps/${m}.tmj`);
    for (const k of ["far", "mid", "near"])
      if (!this.textures.exists(`${m}_${k}`)) this.load.image(`${m}_${k}`, `maps/backgrounds/${m}_${k}.png`);
    const once = (key: string, fn: () => void) => !this.textures.exists(key) && fn();
    once("r01", () => this.load.image("r01", "maps/tilesets/r01.png"));
    once("items", () => this.load.spritesheet("items", "sprites/items.png", { frameWidth: 32, frameHeight: 32 }));
    if (!this.cache.json.exists("icons")) this.load.json("icons", "sprites/items.json");
    for (const o of ORIGINS)
      for (const g of GENDERS) {
        const key = lookKey({ origin: o, gender: g });
        once(key, () =>
          this.load.spritesheet(key, `sprites/player/${key.slice(2)}.png`, { frameWidth: 96, frameHeight: 96 }),
        );
      }
    for (const id of MOBS)
      once(id, () => this.load.spritesheet(id, `sprites/${id.toLowerCase()}.png`, { frameWidth: 64, frameHeight: 64 }));
  }

  private listen<T>(op: number, fn: (p: T) => void): void {
    this.unsubs.push(this.net.on<T>(op, fn));
  }

  create(): void {
    const id = this.change.map.id.toLowerCase();
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
    const tiled = this.cache.tilemap.get(id).data as TiledMap;
    this.coll = collisionFromTiled(tiled);
    this.portals = tiled.layers
      .flatMap((l) => l.objects ?? [])
      .filter((o) => o.type === "portal")
      .map((o) => ({
        id: String(o.properties?.find((p) => p.name === "id")?.value ?? ""),
        x: o.x,
        y: o.y,
        w: o.width ?? 64,
        h: o.height ?? 96,
      }));
    for (const p of this.portals) this.portalGlow(p);
    this.icons = (this.cache.json.get("icons") as string[]) ?? [];
    this.cameras.main.setBounds(0, 0, W, H);
    this.makeAnims();

    const b = this.change.body;
    const start: Body = {
      x: b.x,
      y: b.y,
      vy: b.vy,
      ground: b.st < 2,
      drop: 0,
      facing: 1,
      climb: b.st === MoveState.CLIMB,
    };
    this.serverSelf = { ...b, f: 1 };
    this.me = new Predictor(this.coll, start);
    this.inputSeq = this.change.ack;
    this.meKey = lookKey(this.state.appearance);
    this.meSpr = this.add
      .sprite(b.x, b.y + 4, this.meKey)
      .setOrigin(0.5, 1)
      .setDepth(20)
      .play(`${this.meKey}_idle`);
    this.meLabel = this.label(this.state.name, "#ffe08a");
    this.cameras.main.startFollow(this.meSpr, true, 0.15, 0.15);
    this.bars = this.add.graphics().setDepth(45);
    this.arrow = this.add.graphics().setDepth(46);
    for (const e of this.change.entities) this.addEnt(e);
    for (const d of this.change.drops) this.addDrop(d);
    if (this.state.dead) this.meSpr.setTint(0x555566).setAngle(-90);

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
      j: K.J,
      one: K.ONE,
      q: K.Q,
      e: K.E,
      tab: K.TAB,
    }) as Record<string, Phaser.Input.Keyboard.Key>;
    this.input.keyboard!.addCapture("SPACE,UP,DOWN,LEFT,RIGHT,TAB");
    this.keys.tab!.on("down", () => this.cycleTarget());
    for (const k of ["w", "up"]) this.keys[k]!.on("down", () => (this.latch.up = true));
    this.keys.sp!.on("down", () => (this.latch.jump = true));
    this.keys.q!.on("down", () => this.drink("hp"));
    this.keys.e!.on("down", () => this.drink("mp"));
    this.input.on("pointerdown", (p: Phaser.Input.Pointer) => this.pickAt(p.worldX, p.worldY));
    this.hud.onChatFocus = (on) => {
      this.input.keyboard!.enabled = !on;
      if (on) this.input.keyboard!.disableGlobalCapture();
      else this.input.keyboard!.enableGlobalCapture();
      for (const k of Object.values(this.keys)) k.reset();
    };
    this.hud.onAction = (a) => (a === "hp" || a === "mp" ? this.drink(a) : this.cast(a));

    this.listen<EntitySpawn>(Op.S_ENTITY_SPAWN, (e) => this.addEnt(e));
    this.listen<{ ids: number[] }>(Op.S_ENTITY_DESPAWN, (p) => p.ids.forEach((i) => this.removeEnt(i)));
    this.listen<SSnapshot>(Op.S_SNAPSHOT, (s) => this.onSnapshot(s));
    this.listen<SDropSpawn>(Op.S_DROP_SPAWN, (d) => this.addDrop(d));
    this.listen<SDamage>(Op.S_DAMAGE, (d) => this.onDamage(d));
    this.listen<SSkillCast>(Op.S_SKILL_CAST, (c) => this.onCast(c));
    this.listen<SEntityDied>(Op.S_ENTITY_DIED, (d) => this.onDied(d));
    this.listen<SHeal>(Op.S_HEAL, (h) =>
      this.float(this.meSpr.x, this.meSpr.y - 80, `+${h.amount}`, h.kind === "hp" ? "#7dff8a" : "#7fd1ff", 16),
    );
    this.listen<SLevelUp>(Op.S_LEVEL_UP, (l) => {
      this.float(this.meSpr.x, this.meSpr.y - 96, `LÊN CẤP ${l.level}`, "#9eff8a", 22);
      this.hud.chat("SYSTEM", `Lên cấp ${l.level}! +5 điểm tiềm năng (bản online B2 tự cộng theo gợi ý)`);
      if (l.level === 5) this.hud.chat("SYSTEM", "Mở kỹ năng Tụ Mana Chấn (phím 1)");
    });
    this.listen<SInventoryDelta>(Op.S_INVENTORY_DELTA, (d) => {
      const w = d.picked;
      if (!w) return;
      if (w.kind === "soft") this.float(this.meSpr.x, this.meSpr.y - 84, `+${w.qty} Quan`, "#f0c24a", 15);
      else {
        const text = `${w.name}${w.level ? ` Lv${w.level}` : ""}${RARITY_NAME[w.rarity ?? "common"] ?? ""}`;
        this.float(this.meSpr.x, this.meSpr.y - 84, text, RARITY_COLOR[w.rarity ?? "common"]!, 14);
        this.hud.chat("SYSTEM", `Nhặt: ${text}${w.qty > 1 ? ` ×${w.qty}` : ""}`);
      }
    });
    this.events.once("shutdown", () => {
      for (const u of this.unsubs.splice(0)) u();
      this.input.keyboard?.removeAllListeners();
      this.input.removeAllListeners();
    });
    (window as unknown as { __htk: unknown }).__htk = { scene: this, state: this.state, hud: this.hud };
    this.net.release();
  }

  private label(text: string, color: string, size = 13): Phaser.GameObjects.Text {
    return this.add
      .text(0, 0, text, {
        fontFamily: "system-ui, sans-serif",
        fontSize: `${size}px`,
        fontStyle: "bold",
        color,
        stroke: "#120e1a",
        strokeThickness: 4,
      })
      .setOrigin(0.5, 1)
      .setDepth(40);
  }

  private portalGlow(p: PortalRect): void {
    const g = this.add.graphics().setDepth(4);
    g.fillStyle(0x9fd8ff, 0.18);
    g.fillEllipse(p.x + p.w / 2, p.y + p.h - 34, p.w * 0.9, p.h * 0.8);
    g.lineStyle(2, 0xcfeaff, 0.6);
    g.strokeEllipse(p.x + p.w / 2, p.y + p.h - 34, p.w * 0.9, p.h * 0.8);
    this.tweens.add({ targets: g, alpha: { from: 0.55, to: 1 }, duration: 900, yoyo: true, repeat: -1 });
  }

  private makeAnims(): void {
    if (this.anims.exists("MOB001_idle")) return;
    const row = (r: number, n: number, cols = 6) => Array.from({ length: n }, (_, i) => r * cols + i);
    for (const o of ORIGINS)
      for (const g of GENDERS) {
        const key = lookKey({ origin: o, gender: g });
        for (const [a, r, n, rate, rep] of [
          ["idle", 0, 4, 6, -1],
          ["walk", 1, 6, 10, -1],
          ["attack", 3, 5, 16, 0],
          ["cast", 4, 6, 14, 0],
        ] as const)
          this.anims.create({
            key: `${key}_${a}`,
            frames: this.anims.generateFrameNumbers(key, { frames: row(r, n) }),
            frameRate: rate,
            repeat: rep,
          });
      }
    for (const id of MOBS)
      for (const [a, r, n, rate, rep] of [
        ["idle", 0, 4, 6, -1],
        ["move", 1, 4, 8, -1],
        ["attack", 2, 4, 10, 0],
        ["die", 3, 4, 8, 0],
        ["hurt", 4, 2, 10, 0],
      ] as const)
        this.anims.create({
          key: `${id}_${a}`,
          frames: this.anims.generateFrameNumbers(id, { frames: row(r, n, 4) }),
          frameRate: rate,
          repeat: rep,
        });
  }

  /* ---------------- entities ---------------- */
  private addEnt(e: EntitySpawn): void {
    if (e.id === this.state.you || this.ents.has(e.id)) return;
    let ent: Ent;
    if (e.kind === "player") {
      const key = lookKey(e.appearance);
      const spr = this.add
        .sprite(e.x, e.y + 4, key)
        .setOrigin(0.5, 1)
        .setDepth(19)
        .play(`${key}_idle`);
      ent = {
        id: e.id,
        kind: "player",
        name: e.name,
        lv: e.lv,
        spr,
        label: this.label(e.name, "#ffffff"),
        track: new RemoteTrack(),
        last: { x: e.x, y: e.y, st: e.st, f: e.f, hp: e.hp },
        key,
        scale: 1,
        barUntil: 0,
        actUntil: 0,
        dying: false,
      };
    } else {
      const scale = e.tier === "leader" ? 1.3 : 1;
      const spr = this.add
        .sprite(e.x, e.y + 3, e.templateId)
        .setOrigin(0.5, 1)
        .setDepth(15)
        .setScale(scale)
        .play(`${e.templateId}_idle`);
      if (e.tier !== "normal") spr.preFX?.addGlow(e.tier === "elite" ? 0xc58bff : 0xffa040, 3, 0, false, 0.1, 10);
      const prefix = e.tier === "elite" ? "[Tinh anh] " : e.tier === "leader" ? "[Thủ lĩnh] " : "";
      const color = e.tier === "elite" ? "#c58bff" : e.tier === "leader" ? "#ff8a4a" : "#ffffff";
      ent = {
        id: e.id,
        kind: "mob",
        name: e.name,
        lv: e.lv,
        spr,
        label: this.label(`${prefix}${e.name} Lv${e.lv}`, color, 12),
        track: new RemoteTrack(),
        last: { x: e.x, y: e.y, st: e.st, f: e.f, hp: e.hp },
        key: e.templateId,
        templateId: e.templateId,
        flying: e.flying,
        scale,
        barUntil: 0,
        actUntil: 0,
        dying: false,
      };
    }
    ent.track.push({ t: performance.now(), ...ent.last });
    this.ents.set(e.id, ent);
    this.poseEnt(ent, ent.last.st, ent.last.f, ent.last.x, ent.last.y);
  }

  private removeEnt(id: number): void {
    const d = this.drops.get(id);
    if (d) {
      d.spr.destroy();
      d.label?.destroy();
      this.drops.delete(id);
      return;
    }
    const e = this.ents.get(id);
    if (!e) return;
    this.ents.delete(id);
    if (this.target === id) this.target = null;
    e.label.destroy();
    if (e.dying && e.spr.anims.isPlaying) e.spr.once("animationcomplete", () => e.spr.destroy());
    else e.spr.destroy();
  }

  private addDrop(d: SDropSpawn): void {
    if (this.drops.has(d.id)) return;
    const icon = d.what.kind === "soft" ? "quan" : (d.what.icon ?? "quan");
    const frame = Math.max(0, this.icons.indexOf(icon));
    const spr = this.add
      .sprite(d.x, d.y - 12, "items", frame)
      .setDepth(14)
      .setScale(0.75);
    this.tweens.add({ targets: spr, y: { from: d.y - 40, to: d.y - 12 }, duration: 320, ease: "Bounce.easeOut" });
    const view: DropView = { id: d.id, info: d, spr, freeAt: performance.now() + d.lockedMs, askedAt: 0 };
    if (d.what.kind === "gear") {
      view.label = this.label(
        `${d.what.name}${RARITY_NAME[d.what.rarity ?? "common"]}`,
        RARITY_COLOR[d.what.rarity ?? "common"]!,
        11,
      );
      view.label.setPosition(d.x, d.y - 26).setDepth(13);
    }
    this.drops.set(d.id, view);
  }

  private onSnapshot(s: SSnapshot): void {
    const now = performance.now();
    for (const d of s.ents) {
      if (d.id === this.state.you) Object.assign(this.serverSelf, d);
      else {
        const e = this.ents.get(d.id);
        if (e) Object.assign(e.last, d as Partial<EntityDelta>);
      }
    }
    for (const e of this.ents.values()) if (!e.dying) e.track.push({ t: now, ...e.last });
    const v = this.serverSelf;
    this.lastError = this.me.reconcile(s.ack, {
      x: v.x,
      y: v.y,
      vy: v.vy,
      ground: v.st < 2,
      drop: 0,
      facing: v.f,
      climb: v.st === MoveState.CLIMB,
    });
  }

  /* ---------------- combat feedback ---------------- */
  private posOf(id: number): { x: number; y: number } | null {
    if (id === this.state.you) return { x: this.meSpr.x, y: this.meSpr.y - 52 };
    const e = this.ents.get(id);
    return e ? { x: e.spr.x, y: e.spr.y - e.spr.displayHeight * 0.6 } : null;
  }

  private onDamage(d: SDamage): void {
    const p = this.posOf(d.targetId);
    if (!p) return;
    if (d.targetId === this.state.you) {
      if (d.miss) this.float(p.x, p.y, "Né", "#9aa2bf", 14);
      else {
        this.float(p.x, p.y, `-${d.amount}`, "#ff4d4d", d.crit ? 21 : 17);
        this.meSpr.setTintFill(0xffffff);
        this.time.delayedCall(70, () => (this.state.dead ? this.meSpr.setTint(0x555566) : this.meSpr.clearTint()));
      }
      return;
    }
    const e = this.ents.get(d.targetId)!;
    e.last.hp = d.hp;
    e.barUntil = performance.now() + 4000;
    if (d.sourceId === this.state.you && this.target === null && e.kind === "mob") this.target = e.id;
    if (d.miss) return this.float(p.x, p.y, "Trượt", "#9aa2bf", 14);
    if (d.crit) {
      this.float(p.x, p.y - 6, `Chí mạng ${d.amount}`, "#ffd23f", 22);
      this.spark(p.x, p.y + 10, 0xffd23f, true);
      if (d.sourceId === this.state.you) this.cameras.main.shake(80, 0.004);
    } else {
      this.float(p.x, p.y, `${d.amount}`, e.kind === "player" ? "#ff9a9a" : "#ffffff", 17);
      this.spark(p.x, p.y + 10, 0xfff3d0);
    }
    if (e.kind === "mob" && !e.dying && d.hp > 0) {
      e.spr.play(`${e.key}_hurt`, true);
      e.actUntil = performance.now() + 220;
    }
  }

  private onCast(c: SSkillCast): void {
    const e = this.ents.get(c.casterId);
    if (!e || e.dying) return;
    e.spr.setFlipX(e.kind === "mob" ? c.f > 0 : c.f < 0);
    if (e.kind === "player") {
      e.spr.play(`${e.key}_${c.skillId === "SKL_BASIC" ? "attack" : "cast"}`, true);
      e.actUntil = performance.now() + (c.skillId === "SKL_BASIC" ? 330 : 440);
      if (c.skillId === "SKL_BASIC")
        this.time.delayedCall(110, () => this.slash(e.spr.x, e.spr.y - 30, c.f, 50, 0xffd84a, 6));
      else this.time.delayedCall(260, () => this.ring(e.spr.x + c.f * RULES.burst.ahead, e.spr.y - 26, 0x7fd1ff));
      return;
    }
    e.spr.play(`${e.key}_attack`, true);
    e.actUntil = performance.now() + 420;
    if (c.shot) {
      const shot = c.shot;
      this.time.delayedCall(shot.delayMs, () => {
        if (!e.spr.active) return;
        const ball = this.add
          .circle(e.spr.x, e.spr.y - 30, 5, e.templateId === "MOB005" ? 0x6a3cb0 : 0x8a8494)
          .setDepth(19);
        this.tweens.add({
          targets: ball,
          x: ball.x + Math.sign(shot.vx) * shot.range,
          duration: (shot.range / Math.abs(shot.vx)) * 1000,
          onComplete: () => ball.destroy(),
        });
      });
    }
  }

  private onDied(d: SEntityDied): void {
    if (d.id === this.state.you) {
      this.state.dead = true;
      this.state.deathLoss = -(d.exp ?? 0);
      this.meSpr.anims.stop();
      this.meSpr.setTint(0x555566).setAngle(-90);
      this.hud.showDead(this.state.deathLoss, () => this.net.send(Op.C_REVIVE, { mode: "TOWN" }));
      this.hud.chat("SYSTEM", `Bạn đã gục ngã${this.state.deathLoss ? `, mất ${this.state.deathLoss} EXP` : ""}.`);
      return;
    }
    const e = this.ents.get(d.id);
    if (!e) return;
    if (e.kind === "player") {
      e.spr.setTint(0x555566);
      return;
    }
    e.dying = true;
    e.spr.play(`${e.key}_die`);
    e.label.setVisible(false);
    if (this.target === d.id) this.target = null;
    if (d.exp) {
      this.kills.push(d.id);
      this.float(this.meSpr.x, this.meSpr.y - 64, `+${d.exp} EXP`, "#7fd1ff", 15);
      this.hud.chat("EXP", `Hạ ${e.name} Lv${e.lv} · +${d.exp} EXP`);
    }
  }

  private float(x: number, y: number, str: string, color: string, size: number): void {
    const t = this.label(str, color, size)
      .setPosition(x + (Math.random() - 0.5) * 16, y)
      .setDepth(60);
    this.tweens.add({
      targets: t,
      y: y - 42,
      alpha: { from: 1, to: 0 },
      ease: "Cubic.easeOut",
      duration: 950,
      onComplete: () => t.destroy(),
    });
  }
  private spark(x: number, y: number, color: number, big = false): void {
    const g = this.add.graphics({ x, y }).setDepth(48);
    const n = big ? 9 : 6,
      r1 = big ? 18 : 12;
    g.lineStyle(big ? 3 : 2, color, 1);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.4;
      g.lineBetween(Math.cos(a) * 4, Math.sin(a) * 4, Math.cos(a) * r1, Math.sin(a) * r1);
    }
    this.tweens.add({
      targets: g,
      scale: { from: 0.6, to: 1.35 },
      alpha: { from: 1, to: 0 },
      duration: 210,
      onComplete: () => g.destroy(),
    });
  }
  private slash(x: number, y: number, dir: number, radius: number, color: number, width: number): void {
    const g = this.add.graphics({ x: x + dir * 8, y }).setDepth(21);
    const D = Phaser.Math.DegToRad;
    const [a0, a1, ccw] = dir > 0 ? [D(-80), D(55), false] : [D(260), D(125), true];
    g.lineStyle(width + 4, 0x2a1408, 0.45)
      .beginPath()
      .arc(0, 0, radius, a0, a1, ccw)
      .strokePath();
    g.lineStyle(width, color, 0.95).beginPath().arc(0, 0, radius, a0, a1, ccw).strokePath();
    this.tweens.add({
      targets: g,
      scale: { from: 0.8, to: 1.15 },
      alpha: { from: 1, to: 0 },
      duration: 200,
      onComplete: () => g.destroy(),
    });
  }
  private ring(x: number, y: number, color: number): void {
    const g = this.add.graphics({ x, y }).setDepth(21);
    g.lineStyle(4, color, 1).strokeEllipse(0, 0, 40, 16);
    g.lineStyle(2, 0xffffff, 1).strokeEllipse(0, 0, 28, 10);
    this.tweens.add({
      targets: g,
      scale: { from: 0.4, to: 3 },
      alpha: { from: 1, to: 0 },
      duration: 320,
      onComplete: () => g.destroy(),
    });
  }
  private say(text: string): void {
    const now = performance.now();
    if (now < this.msgAt) return;
    this.msgAt = now + 800;
    this.float(this.meSpr.x, this.meSpr.y - 90, text, "#9aa2bf", 13);
  }

  /* ---------------- player actions ---------------- */
  private targetEnt(): Ent | undefined {
    const e = this.target !== null ? this.ents.get(this.target) : undefined;
    return e && !e.dying ? e : undefined;
  }

  cast(id: string): void {
    if (this.state.dead) return;
    const sk = this.state.skill(id);
    if (!sk) return;
    const now = performance.now();
    if (this.state.stats.lv < sk.unlockLevel) return this.say(`${sk.name}: mở ở Lv${sk.unlockLevel}`);
    if (now < (this.state.ready.get(id) ?? 0)) return;
    if (id !== "SKL_BASIC" && now < this.gcdUntil) return;
    if (this.state.stats.mp < sk.mp) return this.say("Thiếu MP");
    const t = this.targetEnt();
    if (t && Math.abs(t.last.x - this.me.body.x) > 4)
      this.me.body = { ...this.me.body, facing: t.last.x > this.me.body.x ? 1 : -1 };
    this.state.ready.set(id, now + sk.cooldownMs);
    if (id !== "SKL_BASIC") this.gcdUntil = now + RULES.gcdMs;
    this.net.send(Op.C_USE_SKILL, { skillId: id, seq: this.inputSeq, ...(t ? { targetId: t.id } : {}) });
    const f = this.me.body.facing;
    const basic = id === "SKL_BASIC";
    this.meSpr.play(`${this.meKey}_${basic ? "attack" : "cast"}`, true);
    this.busyUntil = now + (basic ? 330 : 440);
    if (basic) this.time.delayedCall(110, () => this.slash(this.meSpr.x, this.meSpr.y - 30, f, 50, 0xffd84a, 6));
    else this.time.delayedCall(260, () => this.ring(this.meSpr.x + f * RULES.burst.ahead, this.meSpr.y - 26, 0x7fd1ff));
  }

  private drink(kind: "hp" | "mp"): void {
    if (this.state.dead) return;
    const it = this.state.potion(kind);
    if (!it) return this.say(kind === "hp" ? "Hết bình HP" : "Hết bình MP");
    const now = performance.now();
    if (now < (this.state.ready.get(kind) ?? 0)) return;
    this.state.ready.set(kind, now + RULES.potionCooldownMs);
    this.net.send(Op.C_USE_ITEM, { instanceId: it.instanceId });
  }

  private cycleTarget(): void {
    const me = this.me.body;
    const list = [...this.ents.values()]
      .filter((e) => e.kind === "mob" && !e.dying && Math.abs(e.last.x - me.x) < 700)
      .sort((a, b) => Math.abs(a.last.x - me.x) - Math.abs(b.last.x - me.x));
    if (!list.length) return;
    const i = list.findIndex((e) => e.id === this.target);
    this.target = list[(i + 1) % list.length]!.id;
  }

  private pickAt(x: number, y: number): void {
    for (const e of this.ents.values())
      if (e.kind === "mob" && !e.dying && e.spr.getBounds().contains(x, y)) {
        this.target = this.target === e.id ? null : e.id;
        return;
      }
  }

  private portalAt(b: Body): PortalRect | undefined {
    return this.portals.find((p) => b.x >= p.x - 8 && b.x <= p.x + p.w + 8 && b.y >= p.y - 8 && b.y <= p.y + p.h + 8);
  }

  private readInput(): MoveInput {
    const k = this.keys;
    const left = k.a!.isDown || k.l!.isDown,
      right = k.d!.isDown || k.r!.isDown;
    return {
      dir: left === right ? 0 : left ? -1 : 1,
      jump: k.sp!.isDown || this.latch.jump,
      down: k.s!.isDown || k.dn!.isDown,
      up: k.w!.isDown || k.up!.isDown || this.latch.up,
    };
  }

  override update(): void {
    // Fixed 50 ms steps on the wall clock, the same as a server tick; one C_MOVE_INPUT per step (max 20/s).
    const wall = performance.now(),
      dtMs = this.lastWall ? wall - this.lastWall : 0;
    this.lastWall = wall;
    this.acc = Math.min(this.acc + dtMs, TICK_MS * 10);
    while (this.acc >= TICK_MS) {
      this.acc -= TICK_MS;
      if (this.state.dead || wall < this.portalWait) continue;
      const inp = this.readInput();
      const upEdge = !!inp.up && (!this.prevUp || this.latch.up);
      this.latch.up = this.latch.jump = false;
      this.prevUp = !!inp.up;
      const portal = upEdge && this.me.body.ground ? this.portalAt(this.me.body) : undefined;
      if (portal) {
        this.portalWait = wall + 1500; // inputs pause until S_MAP_CHANGE (or an error)
        this.net.send(Op.C_USE_PORTAL, { portalId: portal.id, seq: this.inputSeq });
        continue;
      }
      const seq = ++this.inputSeq;
      this.me.apply(seq, inp);
      this.net.send(Op.C_MOVE_INPUT, {
        seq,
        dir: inp.dir,
        jump: inp.jump ? 1 : 0,
        down: inp.down ? 1 : 0,
        up: inp.up ? 1 : 0,
        tickClient: ++this.tickClient,
      });
    }
    if (!this.state.dead && this.input.keyboard?.enabled) {
      if (this.keys.j!.isDown) this.cast("SKL_BASIC");
      if (this.keys.one!.isDown) this.cast("SKL_MANA_BURST");
    }
    const k = this.acc / TICK_MS,
      a = this.me.prev,
      b = this.me.body;
    const x = a.x + (b.x - a.x) * k,
      y = a.y + (b.y - a.y) * k;
    this.meSpr.setPosition(x, y + 4);
    if (!this.state.dead) {
      this.meSpr.setFlipX(b.facing < 0);
      if (wall >= this.busyUntil) {
        if (b.climb) {
          this.meSpr.anims.stop();
          this.meSpr.setFrame(6 + (Math.floor(b.y / 12) % 6));
        } else if (!b.ground) {
          this.meSpr.anims.stop();
          this.meSpr.setFrame(FALL_FRAME);
        } else this.meSpr.play(`${this.meKey}_${this.readInput().dir !== 0 ? "walk" : "idle"}`, true);
      }
    }
    this.meLabel.setPosition(x, y - 92);
    for (const e of this.ents.values()) {
      if (e.dying) continue;
      const s = e.track.sample(wall);
      if (s) this.poseEnt(e, s.st, s.f, s.x, s.y);
    }
    this.pickUpNearby(b, wall);
    this.drawBarsAndArrow(wall);
  }

  private poseEnt(e: Ent, st: number, f: number, x: number, y: number): void {
    if (e.kind === "mob") {
      e.spr.setPosition(x, y + 3).setFlipX(f > 0);
      e.label.setPosition(x, y - 64 * e.scale + 4);
      if (performance.now() >= e.actUntil) e.spr.play(`${e.key}_${st === MoveState.RUN ? "move" : "idle"}`, true);
      return;
    }
    e.spr.setPosition(x, y + 4).setFlipX(f < 0);
    e.label.setPosition(x, y - 92);
    if (st === MoveState.DEAD) {
      e.spr.anims.stop();
      e.spr.setTint(0x555566).setAngle(-90);
      return;
    }
    e.spr.clearTint().setAngle(0);
    if (performance.now() < e.actUntil) return;
    if (st === MoveState.CLIMB) {
      e.spr.anims.stop();
      e.spr.setFrame(6 + (Math.floor(y / 12) % 6));
    } else if (st >= 2) {
      e.spr.anims.stop();
      e.spr.setFrame(FALL_FRAME);
    } else e.spr.play(`${e.key}_${st === 1 ? "walk" : "idle"}`, true);
  }

  /** Walking over a drop asks the server to pick it up (owner lock, combat §6). */
  private pickUpNearby(b: Body, now: number): void {
    if (this.state.dead) return;
    for (const d of this.drops.values()) {
      if (Math.abs(d.info.x - b.x) > RULES.pickupX - 8 || Math.abs(d.info.y - b.y) > 40) continue;
      if (d.info.ownerId !== this.state.you && now < d.freeAt) continue;
      if (now - d.askedAt < 600) continue;
      d.askedAt = now;
      this.net.send(Op.C_PICKUP, { dropId: d.id });
    }
  }

  private drawBarsAndArrow(now: number): void {
    const g = this.bars;
    g.clear();
    for (const e of this.ents.values()) {
      if (e.kind !== "mob" || e.dying || (now > e.barUntil && e.id !== this.target)) continue;
      const w = 40,
        x = e.spr.x - w / 2,
        y = e.spr.y - 64 * e.scale + 8;
      g.fillStyle(0x120e1a, 0.85).fillRect(x - 1, y - 1, w + 2, 6);
      g.fillStyle(0xe53935, 1).fillRect(x, y, (w * e.last.hp) / 255, 4);
    }
    this.arrow.clear();
    const t = this.targetEnt();
    if (t) {
      const ax = t.spr.x,
        ay = t.spr.y - 64 * t.scale - 12 + Math.sin(now / 160) * 3;
      this.arrow.fillStyle(0xffd23f, 1).fillTriangle(ax - 7, ay - 9, ax + 7, ay - 9, ax, ay);
      this.arrow.lineStyle(2, 0x3a2a00, 1).strokeTriangle(ax - 7, ay - 9, ax + 7, ay - 9, ax, ay);
    }
  }

  /** state for tests (e2e) and debugging */
  get debug() {
    return {
      you: this.state.you,
      map: this.change.map,
      me: { ...this.me.body },
      unacked: this.me.unacked,
      corrections: this.me.corrections,
      target: this.target,
      kills: [...this.kills],
      remotes: [...this.ents.values()]
        .filter((e) => e.kind === "player")
        .map((e) => ({ id: e.id, name: e.name, x: e.last.x, y: e.last.y })),
      mobs: [...this.ents.values()]
        .filter((e) => e.kind === "mob" && !e.dying)
        .map((e) => ({ id: e.id, name: e.name, lv: e.lv, x: e.last.x, y: e.last.y, hp: e.last.hp })),
      drops: [...this.drops.values()].map((d) => ({ id: d.id, x: d.info.x, y: d.info.y, what: d.info.what })),
    };
  }
}

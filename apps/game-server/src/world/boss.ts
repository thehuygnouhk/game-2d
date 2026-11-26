import type { Boss, BossEvent, Monster } from "@htk/content";
import {
  BOSS_ENRAGE_ATK,
  BOSS_TIER,
  mobBase,
  mobStats,
  Op,
  rollDamage,
  type SBossAnnounce,
  type Telegraph,
} from "@htk/shared";
import { damagePlayer } from "./combat";
import { type BossRun, Mob, type Player } from "./entities";
import { fly, walk } from "./mob-ai";
import type { Zone } from "./zone";
import type { World } from "./world";

/**
 * Bosses (docs/game-design/05-world-maps-monsters.md §5): scheduled world bosses of Chapter 1 and the
 * DG01 mini-boss Trang Lạc. Attacks are telegraphed areas that land after a delay; players dodge them.
 */
const DT = 0.05;

/** A boss record seen through the monster AI (movement, size, flying). */
export function asMonster(b: Boss): Monster {
  return {
    id: b.id,
    nameKey: b.nameKey,
    level: b.level,
    element: b.element as Monster["element"],
    kind: b.kind,
    sprite: b.sprite,
    size: b.size,
    ai: {
      type: "AGGRESSIVE",
      aggroRange: b.aggroRange,
      leash: 1e6,
      moveSpeed: b.moveSpeed,
      flying: b.flying,
      fleeBelowHp: 0,
      attackRange: 60,
      attackCooldownMs: 1400,
    },
    skills: b.skills,
    drops: b.drops ?? "",
  };
}

/** Spawn a boss in a zone at a boss_spawn point; `scale` = dungeon party scaling (maps §6.1). */
export function spawnBoss(
  zone: Zone,
  def: Boss,
  at: { x: number; y: number },
  kind: BossRun["kind"],
  scale = { hp: 1, atk: 1, reward: 1 },
): Mob {
  const w = zone.world;
  const lv = def.level[0];
  const base = mobBase(lv),
    t = def.kind === "MINIBOSS" ? BOSS_TIER.MINIBOSS : BOSS_TIER.BOSS;
  const max = {
    hp: Math.round(base.hp * t.hp * scale.hp),
    atk: Math.round(base.atk * t.atk * scale.atk),
    def: Math.round(base.def * t.def),
    exp: Math.round(base.exp * t.exp * scale.reward),
    soft: Math.round(base.soft * t.soft * scale.reward),
  };
  const y = def.flying ? at.y - 160 : (zone.surfaceBelow(at.x, at.y - 40) ?? at.y);
  const spawn = { mob: def.id, x: at.x, y, count: 1, radius: 200, respawnSec: 0 };
  const m = new Mob(w.nextId(), asMonster(def), spawn, w.content.text(def.nameKey), lv, "normal", max, at.x, y, w.now);
  m.facing = -1;
  m.boss = {
    def,
    kind,
    cycle: 0,
    nextAt: w.now + 1800,
    busyUntil: 0,
    meleeAt: 0,
    enraged: false,
    phasesDone: new Set(),
    pending: [],
    torn: false,
    pieces: [],
    piecesMax: 0,
    damage: new Map(),
  };
  zone.mobs.set(m.id, m);
  if (kind !== "FIELD") zone.bossState(m); // a field boss shows its bar once someone fights it
  return m;
}

/** A monster summoned by a boss: hunts players, never respawns. */
function summon(zone: Zone, mobId: string, x: number, y: number, lv?: number): Mob | null {
  const w = zone.world;
  const def =
    w.content.monsters.get(mobId) ?? (w.content.bosses.get(mobId) ? asMonster(w.content.bosses.get(mobId)!) : null);
  if (!def) return null;
  const level = lv ?? def.level[0];
  const yy = def.ai.flying ? y : (zone.surfaceBelow(x, y - 40) ?? y);
  const spawn = { mob: mobId, x, y: yy, count: 1, radius: 120, respawnSec: 0 };
  const m = new Mob(
    w.nextId(),
    def,
    spawn,
    w.content.text(def.nameKey),
    level,
    "normal",
    mobStats(level, "normal"),
    x,
    yy,
    w.now,
  );
  m.forceAggro = true;
  zone.mobs.set(m.id, m);
  return m;
}

/**
 * After every hit on a boss: phases (summons at HP marks, Rách Trang at 50%).
 * Returns true when the boss tore apart (it leaves the field; its pages fight on).
 */
export function bossHit(zone: Zone, m: Mob, now: number): boolean {
  const run = m.boss!,
    w = zone.world,
    pct = m.hp / m.max.hp;
  for (const [i, ph] of run.def.phases.entries()) {
    if (run.phasesDone.has(i) || pct > ph.atHp) continue;
    run.phasesDone.add(i);
    if (ph.action === "SPLIT") {
      tear(zone, m, ph.into!, ph.count, now);
      return true;
    }
    zone.chatAll("SYSTEM", w.content.text("boss_msg.summon", { boss: m.name }));
    for (let k = 0; k < ph.count; k++) summon(zone, ph.mob!, Math.round(m.x + (k - (ph.count - 1) / 2) * 60), m.y);
    run.busyUntil = now + 900;
  }
  zone.bossState(m);
  return false;
}

/** BSKL_TEAR_APART (maps §5.3): four pages, each 12.5% of the boss HP, the boss ATK; the body leaves. */
function tear(zone: Zone, m: Mob, into: string, count: number, now: number): void {
  const run = m.boss!,
    w = zone.world;
  const sk = run.def.skillDefs.BSKL_TEAR_APART;
  const pdef = w.content.bosses.get(into)!;
  run.torn = true;
  run.pending = [];
  m.hp = Math.max(1, m.hp);
  zone.mobs.delete(m.id); // gone from the field (and from every view at the next replication)
  for (let i = 0; i < count; i++) {
    const x = Math.round(m.x + (i - (count - 1) / 2) * 70);
    const p = summon(zone, into, x, m.y - 30 - (i % 2) * 40, m.lv);
    if (!p) continue;
    const hp = Math.round(m.max.hp * (sk?.pieceHp ?? 0.125));
    Object.assign(p, { hp, max: { hp, atk: Math.round(m.max.atk * (sk?.mult ?? 1)), def: m.max.def, exp: 0 } });
    p.hoverY = p.y;
    p.pieceOf = m;
    run.pieces.push(p);
    run.piecesMax += hp;
  }
  void pdef;
  zone.chatAll("SYSTEM", w.content.text("boss_msg.tear"));
  m.windup = null;
  run.busyUntil = now;
  zone.bossState(m);
}

const inShape = (t: Telegraph, x: number, y: number) =>
  t.shape === "circle"
    ? Math.hypot(x - t.x, y - t.y) <= t.r!
    : x >= t.x && x <= t.x + t.w! && y >= t.y && y <= t.y + t.h!;

function bossAtk(m: Mob, p: Player, mult: number, zone: Zone, now: number): void {
  if (!p.alive || now < p.invulnUntil) return;
  const r = rollDamage(
    zone.world.rng,
    { atk: m.max.atk * (m.boss!.enraged ? BOSS_ENRAGE_ATK : 1), lv: m.lv, crit: 0.05, critDmg: 1.5 },
    { def: p.combatStats(now).def, lv: p.lv },
    mult,
  );
  damagePlayer(zone, p, r, m.id, now);
}

/** A field boss stays near its spot (maps §5, step B5.1). */
const FIELD_LEASH = 800;
/** ms with nobody in reach before a field boss heals up and walks home */
const FIELD_RESET_MS = 8000;

/** Nobody fights the field boss any more: back to full health, a fresh fight, walk home (maps §5, step B5.1). */
function fieldIdle(zone: Zone, m: Mob, now: number): void {
  const run = m.boss!;
  run.idleSince ??= now;
  if (Math.abs(m.x - m.homeX) > 20) walk(zone, m, Math.sign(m.homeX - m.x) * m.def.ai.moveSpeed * DT);
  if (now - run.idleSince < FIELD_RESET_MS || (m.hp >= m.max.hp && !run.damage.size)) return;
  m.hp = m.max.hp;
  run.damage.clear();
  run.phasesDone.clear();
  run.pending = [];
  run.cycle = 0;
  zone.chatAll("SYSTEM", zone.world.content.text("boss_msg.field_reset", { boss: m.name }));
  zone.bossState(m, true);
}

/** One tick of a boss: land the telegraphs that are due, then attack, chase or hover. */
export function tickBoss(zone: Zone, m: Mob, now: number): void {
  const run = m.boss!;
  if (!m.alive || run.torn) return;
  m.moving = false;
  for (const pd of run.pending.filter((x) => now >= x.at)) {
    run.pending.splice(run.pending.indexOf(pd), 1);
    if (pd.dash) walkFar(zone, m, pd.dash);
    if (pd.dive) m.x = pd.t.x;
    for (const p of zone.players.values())
      if (inShape(pd.t, p.body.x, p.body.y - 10)) bossAtk(m, p, pd.mult, zone, now);
  }
  if (now < run.busyUntil) return;
  let target: Player | undefined,
    best = Infinity;
  const field = run.kind === "FIELD";
  for (const p of zone.players.values()) {
    const dx = Math.abs(p.body.x - m.x);
    if (
      p.alive &&
      now >= p.invulnUntil &&
      dx < m.def.ai.aggroRange &&
      (m.flying || Math.abs(p.body.y - m.y) < 220) &&
      (!field || Math.abs(p.body.x - m.homeX) < FIELD_LEASH) &&
      dx < best
    ) {
      best = dx;
      target = p;
    }
  }
  if (!target) {
    if (field) return fieldIdle(zone, m, now);
    if (m.flying) fly(zone, m, m.homeX, m.hoverY, m.def.ai.moveSpeed);
    return;
  }
  run.idleSince = undefined;
  const dx = target.body.x - m.x,
    dist = Math.abs(dx);
  m.facing = dx >= 0 ? 1 : -1;
  const fast = m.hp / m.max.hp < 0.5 ? 0.7 : 1;
  const lunge = !!run.def.skillDefs.BSKL_LUNGE;
  if (now >= run.nextAt && dist < (lunge ? 420 : 300)) return startSkill(zone, m, target, now, fast);
  if (m.flying) fly(zone, m, target.body.x, m.hoverY + Math.sin(now / 400) * 10, m.def.ai.moveSpeed);
  else if (dist > 70) walk(zone, m, Math.sign(dx) * m.def.ai.moveSpeed * DT);
  if (dist < 80 && Math.abs(target.body.y - m.y) < 120 && now >= run.meleeAt) {
    run.meleeAt = now + 1500;
    for (const o of zone.observers(m.id))
      o.out.send(Op.S_SKILL_CAST, { casterId: m.id, skillId: "BSKL_MELEE", f: m.facing, targetId: target.id });
    bossAtk(m, target, 1, zone, now);
  }
}

function walkFar(zone: Zone, m: Mob, dx: number): void {
  const step = Math.sign(dx) * 8;
  for (let left = Math.abs(dx); left > 0; left -= 8) if (!walk(zone, m, step, false) && !m.flying) break;
}

function startSkill(zone: Zone, m: Mob, t: Player, now: number, fast: number): void {
  const run = m.boss!,
    rng = zone.world.rng;
  const list = Object.entries(run.def.skillDefs).filter(([, d]) => d.shape);
  if (!list.length) return;
  run.cycle++;
  const [id, d] =
    list.find(([, d]) => d.every && run.cycle % d.every === 0) ?? list.find(([, d]) => !d.every) ?? list[0]!;
  const dir = m.facing;
  const feet = t.body.y - 4;
  const tele: { t: Telegraph; delay: number; dash?: number; dive?: boolean }[] = [];
  if (d.shape === "rect") {
    const w = d.w ?? 150,
      h = d.h ?? 60;
    tele.push({
      t: { shape: "rect", x: dir > 0 ? m.x : m.x - w, y: m.y - h, w, h, ms: d.telegraphMs },
      delay: d.telegraphMs,
      ...(id === "BSKL_LUNGE" ? { dash: dir * w } : {}),
    });
  } else if (d.shape === "circle") {
    const dive = id === "BSKL_DIVE_CIRCLE";
    tele.push({
      t: { shape: "circle", x: dive ? t.body.x : m.x, y: dive ? feet : m.y - 4, r: d.r ?? 60, ms: d.telegraphMs },
      delay: d.telegraphMs,
      dive,
    });
  } else {
    const n = d.count ?? 4;
    for (let i = 0; i < n; i++) {
      const delay = d.telegraphMs + i * 80;
      const x = Math.round(t.body.x + (i - (n - 1) / 2) * 64 + (rng() - 0.5) * 24);
      tele.push({ t: { shape: "circle", x, y: feet, r: d.r ?? 34, ms: delay }, delay });
    }
  }
  for (const x of tele) run.pending.push({ at: now + x.delay, t: x.t, mult: d.mult, dash: x.dash, dive: x.dive });
  const longest = Math.max(...tele.map((x) => x.delay));
  run.busyUntil = now + longest + 300;
  run.nextAt = now + (d.cooldownMs ?? 4000) * fast;
  for (const o of zone.observers(m.id))
    o.out.send(Op.S_SKILL_CAST, { casterId: m.id, skillId: id, f: dir, targetId: t.id });
  zone.bossState(
    m,
    false,
    tele.map((x) => x.t),
  );
}

/* ---------------- scheduled bosses (maps §5.1-5.2) ---------------- */
const DAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] as const;

/** Local wall clock parts of an instant in an IANA time zone. */
function localParts(ms: number, tz: string) {
  const f = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    weekday: "short",
  });
  const o: Record<string, string> = {};
  for (const p of f.formatToParts(new Date(ms))) o[p.type] = p.value;
  return {
    y: +o.year!,
    mo: +o.month!,
    d: +o.day!,
    h: +o.hour!,
    mi: +o.minute!,
    s: +o.second!,
    wd: DAYS.indexOf(o.weekday!.toUpperCase().slice(0, 3) as (typeof DAYS)[number]),
  };
}
/** The instant of a local date and time in a time zone. */
export function zonedTime(y: number, mo: number, d: number, h: number, mi: number, tz: string): number {
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  const p = localParts(guess, tz);
  const offset = Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi, p.s) - guess;
  return guess - offset;
}
const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h! * 60 + m!;
};

/** Next time an event starts strictly after `after` (epoch ms). */
export function nextOccurrence(e: BossEvent, after: number): number {
  const tz = e.schedule.tz;
  const today = localParts(after, tz);
  let best = Infinity;
  for (let k = 0; k < 9 && best === Infinity; k++) {
    const day = new Date(Date.UTC(today.y, today.mo - 1, today.d + k));
    const [y, mo, d, wd] = [day.getUTCFullYear(), day.getUTCMonth() + 1, day.getUTCDate(), day.getUTCDay()];
    let mins: number[] = [];
    if ("times" in e.schedule) mins = e.schedule.times.map(toMin);
    else if (DAYS[wd] === e.schedule.weekly.day) {
      const wk = e.schedule.weekly;
      for (let m = toMin(wk.from); m < toMin(wk.to); m += wk.everyMin) mins.push(m);
    }
    for (const m of mins.sort((a, b) => a - b)) {
      const t = zonedTime(y, mo, d, Math.floor(m / 60), m % 60, tz);
      if (t > after) {
        best = t;
        break;
      }
    }
  }
  return best;
}

interface Live {
  event: BossEvent;
  zone: Zone;
  mob: Mob;
  spawnedAt: number;
}

/** The schedule of world bosses on the wall clock (world.clock), checked once a second. */
export class BossSchedule {
  readonly next = new Map<string, { at: number; warned: boolean }>();
  readonly live: Live[] = [];

  constructor(private readonly w: World) {
    const now = w.clock();
    for (const e of w.content.events) this.next.set(e.id, { at: nextOccurrence(e, now - 1), warned: false });
  }

  private announce(a: Omit<SBossAnnounce, "text">, key: string, vars: Record<string, string | number>): void {
    const text = this.w.content.text(`boss_msg.${key}`, vars);
    const msg: SBossAnnounce = { ...a, text };
    this.w.broadcast(Op.S_BOSS_ANNOUNCE, msg);
    this.w.broadcast(Op.S_CHAT_MSG, { channel: "SYSTEM", fromId: 0, fromName: "", text, time: Date.now() });
  }
  private names(e: BossEvent, mapId: string) {
    const b = this.w.content.bosses.get(e.boss)!;
    const map = this.w.content.maps.get(mapId)!;
    return { bossId: e.boss, name: this.w.content.text(b.nameKey), mapId, mapName: this.w.content.text(map.nameKey) };
  }

  tick(): void {
    const now = this.w.clock();
    for (const e of this.w.content.events) {
      const st = this.next.get(e.id)!;
      const n = this.names(e, e.maps[0]!);
      if (!st.warned && e.announceBeforeMin > 0 && now >= st.at - e.announceBeforeMin * 60_000) {
        st.warned = true;
        this.announce({ kind: "SOON", ...n }, "soon", { boss: n.name, map: n.mapName });
      }
      if (now >= st.at) {
        this.spawn(e);
        this.next.set(e.id, { at: nextOccurrence(e, st.at), warned: false });
      }
    }
    for (const l of [...this.live]) {
      const n = this.names(l.event, l.zone.mapId);
      const def = l.mob.boss!.def;
      if (!l.mob.alive) continue;
      if (now >= l.spawnedAt + l.event.despawnAfterMin * 60_000) {
        l.zone.mobs.delete(l.mob.id);
        l.mob.alive = false;
        l.zone.bossState(l.mob, true);
        this.live.splice(this.live.indexOf(l), 1);
        this.announce({ kind: "GONE", ...n, zoneNo: l.zone.zoneNo }, "gone", { boss: n.name });
      } else if (!l.mob.boss!.enraged && def.enrageAfterMin && now >= l.spawnedAt + def.enrageAfterMin * 60_000) {
        l.mob.boss!.enraged = true;
        l.zone.bossState(l.mob);
        this.announce({ kind: "ENRAGE", ...n, zoneNo: l.zone.zoneNo }, "enrage", { boss: n.name });
      }
    }
  }

  /** Spawn the boss of an event now (also used by tests and GM tools). */
  spawn(e: BossEvent): Mob[] {
    const out: Mob[] = [];
    const def = this.w.content.bosses.get(e.boss)!;
    for (const mapId of e.maps) {
      const zones = this.w.zones.get(mapId) ?? [];
      const at = this.w.content.maps.get(mapId)?.bossSpawns.find((s) => s.boss === e.boss);
      if (!at || !zones.length) continue;
      const pick = e.zones === "ALL" ? zones : [zones[Math.floor(this.w.rng() * zones.length)]!];
      for (const z of pick) {
        if (this.live.some((l) => l.zone === z && l.mob.boss!.def.id === e.boss && l.mob.alive)) continue;
        const m = spawnBoss(z, def, at, "WORLD");
        m.boss!.eventKey = e.id;
        this.live.push({ event: e, zone: z, mob: m, spawnedAt: this.w.clock() });
        out.push(m);
        const n = this.names(e, mapId);
        this.announce({ kind: "SPAWN", ...n, zoneNo: z.zoneNo }, "spawn", {
          boss: n.name,
          map: n.mapName,
          zone: z.zoneNo,
        });
      }
    }
    return out;
  }

  killed(m: Mob, killer: Player): void {
    const l = this.live.find((x) => x.mob === m);
    if (!l) return;
    this.live.splice(this.live.indexOf(l), 1);
    const n = this.names(l.event, l.zone.mapId);
    this.announce({ kind: "KILLED", ...n, zoneNo: l.zone.zoneNo, killer: killer.name }, "killed", {
      boss: n.name,
      killer: killer.name,
    });
  }

  /** Cụ Trương's notice board (maps §5.2): live bosses and the next time of each. */
  scheduleText(): string {
    const c = this.w.content;
    const lines = [c.text("dialog.schedule_head")];
    const seen = new Set<string>();
    for (const e of c.events) {
      if (seen.has(e.boss)) continue;
      seen.add(e.boss);
      const b = c.bosses.get(e.boss)!;
      const n = this.names(e, e.maps[0]!);
      const live = this.live.find((l) => l.mob.boss!.def.id === e.boss && l.mob.alive);
      const at = Math.min(...c.events.filter((x) => x.boss === e.boss).map((x) => this.next.get(x.id)!.at));
      const lp = localParts(at, e.schedule.tz);
      const time = `${String(lp.h).padStart(2, "0")}:${String(lp.mi).padStart(2, "0")}`;
      lines.push(
        live
          ? c.text("dialog.schedule_live", { boss: n.name, lv: b.level[0], map: n.mapName, zone: live.zone.zoneNo })
          : c.text("dialog.schedule_next", { boss: n.name, lv: b.level[0], map: n.mapName, time }),
      );
    }
    return lines.join("\n");
  }
}

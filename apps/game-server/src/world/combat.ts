import {
  BOSS_REWARD_MAX_GAP,
  type BagItem,
  CLASS_PASSIVE,
  MAX_LEVEL,
  deathExpLoss,
  ErrorCode,
  type ErrorCodeValue,
  expMod,
  expToNext,
  type Hit,
  hpByte,
  Op,
  PASSIVE,
  type Points,
  POINTS_PER_LEVEL,
  REGEN,
  rollDamage,
  rollLoot,
  RULES,
  type SDamage,
  type SEntityDied,
  type SInventoryDelta,
  type SStatsUpdate,
} from "@htk/shared";
import { bossHit } from "./boss";
import { Drop, type Mob, type Player } from "./entities";
import { callPack } from "./mob-ai";
import type { Zone } from "./zone";

/** Combat on the server (server-design §6, combat §2-7). The client only sends intents. */

export function fail(p: Player, code: ErrorCodeValue, refSeq: number, message: string): void {
  p.out.send(Op.S_ERROR, { code, refSeq, message });
}

/** Skills wait until the movement the player pressed them after has been simulated (C_USE_SKILL.seq). */
export function runSkills(zone: Zone, p: Player, now: number): void {
  while (p.skillQueue.length) {
    const q = p.skillQueue[0]!;
    if (q.cmd.seq > p.ack && now - q.at < 500) return;
    p.skillQueue.shift();
    cast(zone, p, q.cmd.skillId, q.cmd.targetId, q.refSeq, now);
  }
}

const overlaps = (a: [number, number, number, number], b: [number, number, number, number]) =>
  a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];
const mobBox = (m: Mob): [number, number, number, number] => [m.x - m.w / 2, m.y - m.h, m.x + m.w / 2, m.y];

/** Areas of the class skills (classes §4), px: [ahead, width, height, all targets]. */
const AREA: Record<string, [number, number, number, boolean]> = {
  slash: [0, 90, 70, true],
  lance: [0, 150, 60, true],
  wave: [0, 150, 80, true],
  beam: [0, 380, 50, true],
};
/** Hỏa Cầu / Thủy Đạn: a shot flying 520 px/s for 400 px, hitting the first monster (prototype). */
export const BOLT = { speed: 520, range: 400 } as const;

function cast(zone: Zone, p: Player, skillId: string, targetId: number | undefined, refSeq: number, now: number): void {
  const sk = zone.world.content.skills.get(skillId);
  if (!sk || (sk.set !== "NOVICE" && sk.set !== p.cls))
    return fail(p, ErrorCode.E_INVALID_TARGET, refSeq, "UNKNOWN_SKILL");
  if (!p.alive) return fail(p, ErrorCode.E_DEAD, refSeq, "DEAD");
  if (p.lv < sk.unlockLevel) return fail(p, ErrorCode.E_LEVEL_REQUIRED, refSeq, `LEVEL_${sk.unlockLevel}`);
  const tol = RULES.cooldownToleranceMs;
  if (now < (p.cds.get(sk.id) ?? 0) - tol || (sk.gcd && now < p.gcdUntil - tol))
    return fail(p, ErrorCode.E_COOLDOWN, refSeq, "SKILL_ON_COOLDOWN");
  if (p.mp < sk.mp) return fail(p, ErrorCode.E_NOT_ENOUGH_MP, refSeq, "NOT_ENOUGH_MP");
  p.mp -= sk.mp;
  p.cds.set(sk.id, now + sk.cooldownSec * 1000);
  if (sk.gcd) p.gcdUntil = now + RULES.gcdMs;

  const locked = targetId ? zone.mobs.get(targetId) : undefined;
  const b = p.body;
  if (locked?.alive && Math.abs(locked.x - b.x) > 4) p.body = { ...b, facing: locked.x > b.x ? 1 : -1 };
  const f = p.body.facing,
    px = p.body.x,
    py = p.body.y,
    tolPx = RULES.rangeTolerance;
  let hits: Mob[] = [];
  const alive = (m: Mob) => m.alive && !m.boss?.torn;
  if (sk.shape === "melee") {
    const reach = RULES.meleeReach;
    if (
      locked &&
      alive(locked) &&
      Math.abs(locked.x - px) - locked.w / 2 <= reach + tolPx &&
      overlaps(mobBox(locked), [px - 1e4, py - 60 - tolPx, px + 1e4, py + tolPx])
    )
      hits = [locked];
    else {
      const box: [number, number, number, number] =
        f > 0 ? [px, py - 60, px + reach + tolPx, py] : [px - reach - tolPx, py - 60, px, py];
      const near = [...zone.mobs.values()]
        .filter((m) => alive(m) && overlaps(mobBox(m), box))
        .sort((a, c) => Math.abs(a.x - px) - Math.abs(c.x - px));
      hits = near.slice(0, 1);
    }
  } else if (sk.shape === "burst") {
    const { ahead, w, h } = RULES.burst,
      cx = px + f * ahead,
      pad = tolPx / 2;
    const box: [number, number, number, number] = [cx - w / 2 - pad, py - h - pad, cx + w / 2 + pad, py + pad];
    hits = [...zone.mobs.values()].filter((m) => alive(m) && overlaps(mobBox(m), box));
  } else if (AREA[sk.shape]) {
    const [, w, h] = AREA[sk.shape]!,
      pad = tolPx / 2;
    const box: [number, number, number, number] =
      f > 0 ? [px - pad, py - h - pad, px + w + pad, py + pad] : [px - w - pad, py - h - pad, px + pad, py + pad];
    hits = [...zone.mobs.values()].filter((m) => alive(m) && overlaps(mobBox(m), box));
  }
  const cast = { casterId: p.id, skillId: sk.id, f, ...(locked ? { targetId: locked.id } : {}) };
  for (const o of zone.observers(p.id)) if (o !== p) o.out.send(Op.S_SKILL_CAST, cast);
  const isSkill = sk.id !== "SKL_BASIC";
  let mult = sk.atkMult * (isSkill && p.appearance.origin === "NOBLE" ? PASSIVE.nobleSkillMult : 1);
  if (isSkill && p.cls === "WATER" && p.tideReady) {
    p.tideReady = false; // Triều Dâng
    mult *= 1 + CLASS_PASSIVE.water.bonus;
  }
  p.lastCombat = now;
  p.invulnUntil = 0; // attacking ends the revive protection (combat §4.1)
  const opts = { burn: !!(sk as { burn?: boolean }).burn };
  if (sk.shape === "bolt") {
    zone.pshots.push({ p, skill: sk.id, x: px + f * 20, y: py - 40, vx: f * BOLT.speed, left: BOLT.range, mult, opts });
    return;
  }
  for (const m of hits) hitMob(zone, p, m, mult, now, opts);
  if (hits.length) zone.world.quests.event(p, "USE_SKILL", sk.id);
}

/** A player shot reaches a monster (tick of the zone). */
export function shotLands(zone: Zone, s: PlayerShot, m: Mob, now: number): void {
  if (!zone.players.has(s.p.id)) return;
  hitMob(zone, s.p, m, s.mult, now, s.opts);
  zone.world.quests.event(s.p, "USE_SKILL", s.skill);
}
export interface PlayerShot {
  p: Player;
  skill: string;
  x: number;
  y: number;
  vx: number;
  left: number;
  mult: number;
  opts: { burn: boolean };
}
export const mobHitBox = mobBox;

export function hitMob(
  zone: Zone,
  p: Player,
  m: Mob,
  mult: number,
  now: number,
  opts: { burn?: boolean; dot?: number } = {},
): void {
  if (!m.alive || m.boss?.torn) return;
  const s = p.combatStats(now);
  const burning = !!m.burn && now <= m.burn.until;
  if (p.cls === "FIRE" && burning && opts.dot === undefined) mult *= 1 + CLASS_PASSIVE.fire.burningBonus; // Lửa Bén
  const r =
    opts.dot !== undefined
      ? { miss: false, crit: false, amount: opts.dot }
      : rollDamage(
          zone.world.rng,
          { atk: s.atk, lv: p.lv, crit: s.crit, critDmg: s.critDmg },
          { def: m.max.def, lv: m.lv },
          mult,
        );
  p.lastCombat = now;
  m.threat.set(p.id, (m.threat.get(p.id) ?? 0) + r.amount);
  const fight = m.boss ?? m.pieceOf?.boss;
  if (fight) fight.damage.set(p.id, (fight.damage.get(p.id) ?? 0) + r.amount);
  if (!r.miss && opts.dot === undefined) {
    if (opts.burn) {
      const fb = CLASS_PASSIVE.fire;
      m.burn = {
        until: now + fb.burnMs,
        next: now + 1000,
        dmg: Math.max(1, Math.round((s.atk * fb.burnPct) / fb.burnTicks)),
        by: p.id,
      };
    }
    if (p.cls === "WATER" && ++p.tideN >= CLASS_PASSIVE.water.hits) {
      p.tideN = 0;
      p.tideReady = true;
      p.mp = Math.min(p.stats.mp, p.mp + Math.round(p.stats.mp * CLASS_PASSIVE.water.mpPct));
    }
  }
  if (m.mode !== "return") {
    let top = 0,
      best = -1;
    for (const [id, v] of m.threat) if (v > best && zone.players.get(id)?.alive) [top, best] = [id, v];
    m.targetId = top;
    m.mode = "chase";
    if (m.def.ai.type === "PACK" && !m.boss) callPack(zone, m, p);
  }
  if (!r.miss) {
    m.hp -= r.amount;
    m.hurtUntil = now + RULES.mobHurtMs;
    m.knockDir = p.body.x < m.x ? 1 : -1;
  }
  const dmg: SDamage = {
    targetId: m.id,
    sourceId: p.id,
    amount: r.amount,
    crit: r.crit,
    miss: r.miss,
    hp: hpByte(m.hp, m.max.hp),
  };
  zone.sendAbout(m.id, Op.S_DAMAGE, dmg, p);
  if (m.boss) {
    if (bossHit(zone, m, now)) return; // torn apart: the pages fight on
  } else if (m.pieceOf) zone.bossState(m.pieceOf);
  if (m.hp <= 0) killMob(zone, m, p, now);
}

/** Shares of a kill (combat §2.3): everyone with at least 10% of the damage, by damage dealt. */
function shares(zone: Zone, damage: Map<number, number>, exp: number, lv: number): Map<number, number> {
  const total = [...damage.values()].reduce((a, b) => a + b, 0) || 1;
  const gained = new Map<number, number>();
  for (const [id, dmg] of damage) {
    const pl = zone.players.get(id);
    const share = dmg / total;
    if (!pl?.alive || share < RULES.expShareMin) continue;
    gained.set(id, Math.max(1, Math.round(exp * expMod(pl.lv - lv) * share)));
  }
  return gained;
}
const topDealer = (zone: Zone, damage: Map<number, number>, fallback: number) => {
  let owner = fallback,
    best = -1;
  for (const [id, d] of damage) if (d > best && zone.players.has(id)) [owner, best] = [id, d];
  return owner;
};

function killMob(zone: Zone, m: Mob, killer: Player, now: number): void {
  const w = zone.world;
  m.alive = false;
  m.hp = 0;
  m.windup = null;
  m.burn = null;
  zone.mobGone(m, now);
  if (m.pieceOf) return pieceDown(zone, m, killer, now);
  if (m.boss) return worldBossDown(zone, m, killer, now);
  // combat §2.3: everyone with at least 10% of the damage shares the EXP by damage dealt
  const total = [...m.threat.values()].reduce((a, b) => a + b, 0) || 1;
  const gained = new Map<number, number>();
  let owner = killer.id,
    best = -1;
  for (const [id, dmg] of m.threat) {
    const pl = zone.players.get(id);
    if (dmg > best && pl) [owner, best] = [id, dmg];
    const share = dmg / total;
    if (!pl?.alive || share < RULES.expShareMin) continue;
    const exp = Math.max(1, Math.round(m.max.exp * expMod(pl.lv - m.lv) * share));
    gained.set(id, exp);
  }
  for (const o of zone.observers(m.id)) {
    const died: SEntityDied = { id: m.id, killerId: killer.id };
    const exp = gained.get(o.id);
    if (exp) died.exp = exp;
    o.out.send(Op.S_ENTITY_DIED, died);
  }
  if (!killer.visible.has(m.id) && gained.has(killer.id))
    killer.out.send(Op.S_ENTITY_DIED, { id: m.id, killerId: killer.id, exp: gained.get(killer.id) });
  for (const [id, exp] of gained) {
    const pl = zone.players.get(id)!;
    gainExp(pl, exp, now);
    w.quests.onKill(pl, m.def.id);
  }
  // combat §6: drops near the body, locked to the top damage dealer for 15 s, gone after 60 s
  const table = w.content.drops.get(m.def.drops);
  if (!table) return;
  const loot = rollLoot(w.rng, table, m.lv, m.tier);
  loot.forEach((l, i) => {
    const x = Math.round(m.x + (i - (loot.length - 1) / 2) * 22);
    const y = zone.surfaceBelow(x, m.y - 8) ?? m.y;
    const d = new Drop(w.nextId(), l, x, y, owner, now + RULES.dropLockMs, now + RULES.dropTtlMs);
    zone.drops.set(d.id, d);
  });
}

export function gainExp(p: Player, n: number, now: number): void {
  p.exp += n;
  const cap = p.questDone("Q_MAIN_11") ? MAX_LEVEL : RULES.levelCapChapter1;
  let up = false;
  while (p.exp >= expToNext(p.lv) && p.lv < cap) {
    p.exp -= expToNext(p.lv);
    p.lv++;
    p.statPoints += POINTS_PER_LEVEL; // combat §3.3: +5 potential points per level, spent by the player
    p.pendingPoints += POINTS_PER_LEVEL;
    p.recompute(true);
    up = true;
    p.out.send(Op.S_LEVEL_UP, { level: p.lv, statPoints: p.statPoints });
  }
  if (p.lv >= cap) p.exp = Math.min(p.exp, expToNext(p.lv) - 1); // quests §4: Lv10 waits for Q_MAIN_11
  if (up) {
    sendStats(p, p.full(now));
    // server-design §8: points are written at once, with the level they come from
    void p.enqueue(() => p.store.levelUp(p)).catch((e) => p.store.onError(p, "levelUp", e));
  }
}

/** C_ALLOCATE_POINTS (combat §3.3): spend free potential points, written at once. */
export function allocatePoints(p: Player, pts: Points, refSeq: number, now: number): void {
  const n = pts.hp + pts.mp + pts.atk + pts.def + pts.crit;
  if (n > p.statPoints) return fail(p, ErrorCode.E_INVALID_PAYLOAD, refSeq, "NOT_ENOUGH_POINTS");
  p.statPoints -= n; // reserved now so a second request cannot spend the same points
  void p
    .enqueue(() => p.store.spend(p, pts))
    .then((ok) => {
      if (!ok) {
        p.statPoints += n;
        return fail(p, ErrorCode.E_INVALID_PAYLOAD, refSeq, "NOT_ENOUGH_POINTS");
      }
      const before = p.stats;
      for (const k of ["hp", "mp", "atk", "def", "crit"] as const) p.pts[k] += pts[k];
      p.recompute();
      // the new maximum is added to the current HP and MP too
      p.hp = Math.min(p.stats.hp, p.hp + (p.stats.hp - before.hp));
      p.mp = Math.min(p.stats.mp, p.mp + (p.stats.mp - before.mp));
      sendStats(p, p.full(now));
    })
    .catch((e) => {
      p.statPoints += n;
      p.store.onError(p, "spend", e);
      fail(p, ErrorCode.E_INTERNAL, refSeq, "SAVE_FAILED");
    });
}

/** A monster melee swing or shot reaches a player. */
export function mobAttackLands(zone: Zone, m: Mob, p: Player, now: number): void {
  if (!p.alive || now < p.invulnUntil) return;
  const r = rollDamage(
    zone.world.rng,
    { atk: m.max.atk, lv: m.lv, crit: 0.05, critDmg: 1.5 },
    { def: p.combatStats(now).def, lv: p.lv },
    1,
  );
  damagePlayer(zone, p, r, m.id, now);
}

export function damagePlayer(zone: Zone, p: Player, r: Hit, sourceId: number, now: number): void {
  if (!p.alive) return;
  p.lastCombat = now;
  if (!r.miss) p.hp -= r.amount;
  const dmg: SDamage = {
    targetId: p.id,
    sourceId,
    amount: r.amount,
    crit: r.crit,
    miss: r.miss,
    hp: hpByte(p.hp, p.stats.hp),
  };
  zone.sendAbout(p.id, Op.S_DAMAGE, dmg);
  if (p.hp <= 0) playerDies(zone, p, sourceId, now);
}

/** combat §7: lose 2% of the level's EXP, revive in town (C_REVIVE). */
function playerDies(zone: Zone, p: Player, killerId: number, now: number): void {
  p.alive = false;
  p.hp = 0;
  p.diedAt = now;
  p.skillQueue.length = 0;
  p.townMap = zone.inst ? zone.inst.entry.mapId : zone.world.townOf(zone.map).id;
  const loss = Math.min(p.exp, deathExpLoss(p.lv));
  p.exp -= loss;
  for (const o of zone.observers(p.id))
    o.out.send(Op.S_ENTITY_DIED, o === p ? { id: p.id, killerId, exp: -loss } : { id: p.id, killerId });
  for (const m of zone.mobs.values())
    if (m.targetId === p.id) {
      m.targetId = 0;
      m.threat.delete(p.id);
      m.windup = null;
      if (m.mode === "chase") m.mode = "idle";
    }
  sendStats(p, { hp: 0, exp: p.exp });
}

export function sendStats(p: Player, s: SStatsUpdate): void {
  if (s.hp !== undefined) p.shownVitals.hp = s.hp;
  if (s.mp !== undefined) p.shownVitals.mp = s.mp;
  if (s.exp !== undefined) p.shownVitals.exp = s.exp;
  p.out.send(Op.S_STATS_UPDATE, s);
}

/** 5. status: hazards, origin passives, regeneration (combat §3.2, classes §2); vitals to the owner. */
export function tickPlayerStatus(zone: Zone, p: Player, now: number): void {
  if (p.alive && p.hazardHit) {
    p.hazardHit = false;
    if (now >= p.hazardCdUntil && now >= p.invulnUntil) {
      p.hazardCdUntil = now + RULES.hazardEveryMs;
      const amount = Math.max(1, Math.round(p.stats.hp * RULES.hazardPct));
      damagePlayer(zone, p, { miss: false, crit: false, amount }, 0, now);
    }
  }
  if (!p.alive) return;
  const max = p.stats;
  const origin = p.appearance.origin;
  if (origin === "VILLAGER" && p.hp < max.hp * PASSIVE.rally.belowHp && now >= p.rallyCdUntil) {
    p.rallyUntil = now + PASSIVE.rally.durationMs;
    p.rallyCdUntil = now + PASSIVE.rally.cooldownMs;
    const s = p.full(now);
    sendStats(p, { atk: s.atk, def: s.def, power: s.power, rallyMs: PASSIVE.rally.durationMs });
  } else if (p.rallyUntil && now >= p.rallyUntil) {
    p.rallyUntil = 0;
    const s = p.full(now);
    sendStats(p, { atk: s.atk, def: s.def, power: s.power });
  }
  const out = now - p.lastCombat >= REGEN.combatMs;
  const dt = 50;
  if (out && p.hp < max.hp)
    p.hp = Math.min(
      max.hp,
      p.hp + (max.hp * REGEN.hpOutPct * dt) / (origin === "ANCIENT" ? REGEN.hpOutEveryMsAncient : REGEN.hpOutEveryMs),
    );
  const mpRate = (out ? REGEN.mpOutPctPerS : REGEN.mpInPctPerS) * (origin === "NOBLE" ? REGEN.mpNobleMult : 1);
  p.mp = Math.min(max.mp, p.mp + (max.mp * mpRate * dt) / 1000);
  if (zone.world.tick % 2 === 0) {
    const v = { hp: Math.ceil(p.hp), mp: Math.floor(p.mp), exp: p.exp };
    const s: SStatsUpdate = {};
    if (v.hp !== p.shownVitals.hp) s.hp = v.hp;
    if (v.mp !== p.shownVitals.mp) s.mp = v.mp;
    if (v.exp !== p.shownVitals.exp) s.exp = v.exp;
    if (Object.keys(s).length) sendStats(p, s);
  }
}

/**
 * C_PICKUP: the drop leaves the ground at once (nobody else can take it), then the bag changes in a database
 * transaction keyed by the drop (idemKey, ledger row for Quan). If that fails the drop goes back on the ground.
 */
export function pickup(zone: Zone, p: Player, dropId: number, refSeq: number, now: number): void {
  const d = zone.drops.get(dropId);
  if (!d) return fail(p, ErrorCode.E_ITEM_NOT_FOUND, refSeq, "DROP_GONE");
  if (!p.alive) return fail(p, ErrorCode.E_DEAD, refSeq, "DEAD");
  if (Math.abs(p.body.x - d.x) > RULES.pickupX || Math.abs(p.body.y - d.y) > RULES.pickupY)
    return fail(p, ErrorCode.E_OUT_OF_RANGE, refSeq, "TOO_FAR");
  if (now < d.lockedUntil && d.ownerId !== p.id) return fail(p, ErrorCode.E_INVALID_TARGET, refSeq, "DROP_LOCKED");
  zone.drops.delete(d.id);
  const putBack = () => {
    if (zone.world.now < d.expiresAt) zone.drops.set(d.id, d);
  };
  void p
    .enqueue(() => p.store.pickup(p, d.loot, d.key))
    .then((delta) => {
      if (!delta) {
        putBack();
        return fail(p, ErrorCode.E_INVENTORY_FULL, refSeq, "BAG_FULL");
      }
      p.out.send(Op.S_INVENTORY_DELTA, delta);
    })
    .catch((e) => {
      putBack();
      p.store.onError(p, "pickup", e);
      fail(p, ErrorCode.E_INTERNAL, refSeq, "SAVE_FAILED");
    });
}

export function useItem(zone: Zone, p: Player, instanceId: string, refSeq: number, now: number): void {
  const it = p.bag.items.find((i) => i.instanceId === instanceId);
  if (!it) return fail(p, ErrorCode.E_ITEM_NOT_FOUND, refSeq, "NO_ITEM");
  if (!p.alive) return fail(p, ErrorCode.E_DEAD, refSeq, "DEAD");
  const kind = it.healHp ? "hp" : it.healMp ? "mp" : null;
  if (!kind) return fail(p, ErrorCode.E_INVALID_TARGET, refSeq, "NOT_USABLE");
  if (now < p.potionCd[kind]) return fail(p, ErrorCode.E_COOLDOWN, refSeq, "POTION_ON_COOLDOWN");
  p.potionCd[kind] = now + RULES.potionCooldownMs;
  void p
    .enqueue(() => p.store.consume(p, instanceId))
    .then((taken) => {
      if (!taken) {
        p.potionCd[kind] = 0;
        return fail(p, ErrorCode.E_ITEM_NOT_FOUND, refSeq, "NO_ITEM");
      }
      if (!p.alive) return p.out.send(Op.S_INVENTORY_DELTA, taken.delta);
      drink(zone, p, it, kind, taken.delta);
    })
    .catch((e) => {
      p.potionCd[kind] = 0;
      p.store.onError(p, "consume", e);
      fail(p, ErrorCode.E_INTERNAL, refSeq, "SAVE_FAILED");
    });
}

function drink(zone: Zone, p: Player, it: BagItem, kind: "hp" | "mp", delta: SInventoryDelta): void {
  let amount: number;
  if (kind === "hp") {
    // Ấn Cổ Hộ Thân (classes §2): healing received +15%
    const heal = Math.round(it.healHp! * (p.appearance.origin === "ANCIENT" ? 1.15 : 1));
    amount = Math.min(heal, p.stats.hp - Math.ceil(p.hp));
    p.hp = Math.min(p.stats.hp, p.hp + heal);
  } else {
    amount = Math.min(it.healMp!, p.stats.mp - Math.floor(p.mp));
    p.mp = Math.min(p.stats.mp, p.mp + it.healMp!);
  }
  p.out.send(Op.S_INVENTORY_DELTA, delta);
  (p.zone ?? zone).sendAbout(p.id, Op.S_HEAL, { targetId: p.id, sourceId: p.id, amount: Math.max(0, amount), kind });
  sendStats(p, kind === "hp" ? { hp: Math.ceil(p.hp) } : { mp: Math.floor(p.mp) });
}

/* ---------------- bosses (maps §5) ---------------- */

function dropAll(zone: Zone, loot: ReturnType<typeof rollLoot>, x: number, y: number, owner: number, now: number) {
  loot.forEach((l, i) => {
    const dx = Math.round(x + (i - (loot.length - 1) / 2) * 22);
    const dy = zone.surfaceBelow(dx, y - 8) ?? y;
    const d = new Drop(zone.world.nextId(), l, dx, dy, owner, now + RULES.dropLockMs, now + RULES.dropTtlMs);
    zone.drops.set(d.id, d);
  });
}

function announceKill(zone: Zone, m: Mob, gained: Map<number, number>, killer: Player) {
  for (const o of zone.players.values()) {
    const died: SEntityDied = { id: m.id, killerId: killer.id };
    const exp = gained.get(o.id);
    if (exp) died.exp = exp;
    o.out.send(Op.S_ENTITY_DIED, died);
  }
}

/** A scheduled boss falls: EXP by damage, loot for the top dealer (none above the level gap), announce. */
function worldBossDown(zone: Zone, m: Mob, killer: Player, now: number): void {
  const w = zone.world,
    run = m.boss!;
  const gained = shares(zone, run.damage, m.max.exp, m.lv);
  announceKill(zone, m, gained, killer);
  for (const [id, exp] of gained) {
    const pl = zone.players.get(id)!;
    gainExp(pl, exp, now);
    w.quests.event(pl, "BOSS", m.def.id);
  }
  const owner = topDealer(zone, run.damage, killer.id);
  const table = run.def.drops ? w.content.drops.get(run.def.drops) : undefined;
  if (table) {
    const ownerLv = zone.players.get(owner)?.lv ?? killer.lv;
    let loot = rollLoot(w.rng, table, m.lv, "leader");
    if (ownerLv > m.lv + BOSS_REWARD_MAX_GAP) loot = loot.filter((l) => l.kind === "soft");
    dropAll(zone, loot, m.x, m.y, owner, now);
  }
  zone.bossState(m, true);
  if (run.kind === "FIELD") zone.fieldBossDown(m, now);
  else w.bosses.killed(m, killer);
}

/** A page of Trang Lạc falls; the last one brings the boss down (maps §5.3). */
function pieceDown(zone: Zone, piece: Mob, killer: Player, now: number): void {
  const boss = piece.pieceOf!,
    run = boss.boss!;
  for (const o of zone.observers(piece.id)) o.out.send(Op.S_ENTITY_DIED, { id: piece.id, killerId: killer.id });
  if (run.pieces.some((x) => x.alive)) return zone.bossState(boss);
  // the boss pays out once: EXP by damage over the whole fight, its Quan, the BOSS objective, the chest
  const gained = shares(zone, run.damage, boss.max.exp, boss.lv);
  for (const [id, exp] of gained) {
    const pl = zone.players.get(id)!;
    pl.out.send(Op.S_ENTITY_DIED, { id: boss.id, killerId: killer.id, exp });
    gainExp(pl, exp, now);
  }
  for (const pl of zone.players.values()) zone.world.quests.event(pl, "BOSS", boss.def.id);
  const owner = topDealer(zone, run.damage, killer.id);
  const soft = Math.round(boss.max.soft ?? 0);
  if (soft > 0) dropAll(zone, [{ kind: "soft", qty: soft }], boss.x, boss.y, owner, now);
  zone.bossState(boss, true);
  zone.dungeonBossDown(boss);
}

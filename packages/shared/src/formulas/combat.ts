/**
 * Combat and progression formulas: docs/game-design/04-combat-and-progression.md §2-7.
 * The server is the only one that rolls; the client uses these for display (combat, header note).
 * Every random draw goes through an injected `Rng` so tests and simulations are reproducible.
 */
export type Rng = () => number;

/** Small fast seeded generator for tests and simulations (not for anything secret). */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const MAX_LEVEL = 100;
/** §2: EXP from level L to L+1. */
export const expToNext = (L: number): number => 50 * L * L + 100 * L;

/** §5.1: a normal monster of level L. */
export function mobBase(L: number) {
  return {
    hp: Math.round(30 + 22 * Math.pow(L, 1.5)),
    atk: Math.round(8 + 3.2 * L),
    def: Math.round(2.5 * L),
    exp: 8 * L + 10,
    soft: 4 * L,
  };
}

/** §2.1.1: elite and leader monsters (1/15 and 1/60 per respawn, at most one leader per zone). */
export type Tier = "normal" | "elite" | "leader";
export const TIER: Record<Tier, { hp: number; atk: number; def: number; exp: number; soft: number }> = {
  normal: { hp: 1, atk: 1, def: 1, exp: 1, soft: 1 },
  elite: { hp: 3, atk: 1.3, def: 1.2, exp: 3, soft: 3 },
  leader: { hp: 6, atk: 1.6, def: 1.4, exp: 6, soft: 5 },
};
export const ELITE_CHANCE = 1 / 15;
export const LEADER_CHANCE = 1 / 60;

export function rollTier(rng: Rng, leaderAlive: boolean): Tier {
  if (!leaderAlive && rng() < LEADER_CHANCE) return "leader";
  return rng() < ELITE_CHANCE ? "elite" : "normal";
}

export function mobStats(L: number, tier: Tier) {
  const b = mobBase(L),
    t = TIER[tier];
  return {
    hp: Math.round(b.hp * t.hp),
    atk: Math.round(b.atk * t.atk),
    def: Math.round(b.def * t.def),
    exp: Math.round(b.exp * t.exp),
  };
}

/** §2.2: EXP multiplier for d = player level − monster level. */
export function expMod(d: number): number {
  if (d <= -5) return 1.5;
  if (d < 0) return 1 + 0.1 * Math.abs(d);
  if (d <= 5) return 1;
  return Math.max(0.1, 1 - 0.15 * (d - 5));
}

export interface Attacker {
  atk: number;
  lv: number;
  crit: number; // 0..0.5
  critDmg: number; // 1.5 = 150%
  acc?: number;
}
export interface Defender {
  def: number;
  lv: number;
  eva?: number;
}
export interface Hit {
  miss: boolean;
  crit: boolean;
  amount: number;
}

/** §4.2: chance to hit. */
export function hitChance(a: Attacker, t: Defender): number {
  const v = 0.95 - 0.02 * Math.max(0, t.lv - a.lv) + ((a.acc ?? 0) - (t.eva ?? 0)) / 1000;
  return Math.min(1, Math.max(0.3, v));
}

/** §4.2: one hit. `mult` is the skill multiplier (with passives already folded in). Element ×1 until classes go online. */
export function rollDamage(rng: Rng, a: Attacker, t: Defender, mult: number): Hit {
  if (rng() >= hitChance(a, t)) return { miss: true, crit: false, amount: 0 };
  const crit = rng() < a.crit;
  const defRed = t.def / (t.def + 15 * a.lv + 100);
  const variance = 0.95 + rng() * 0.1;
  const amount = Math.max(1, Math.round(a.atk * mult * (crit ? a.critDmg : 1) * (1 - defRed) * variance));
  return { miss: false, crit, amount };
}

/** §7: dying to a monster costs 2% of the EXP of the current level (never a level). */
export const DEATH_EXP_LOSS = 0.02;
export const deathExpLoss = (L: number): number => Math.floor(expToNext(L) * DEATH_EXP_LOSS);

/** §3.2: regeneration. Out of combat = no damage dealt or taken for 5 s. */
export const REGEN = {
  combatMs: 5000,
  hpOutPct: 0.01, // of max HP ...
  hpOutEveryMs: 5000, // ... every 5 s (Ancient origin: every 3 s)
  hpOutEveryMsAncient: 3000,
  mpOutPctPerS: 0.02,
  mpInPctPerS: 0.005,
  mpNobleMult: 1.25, // Thế Gia: Gia Truyền
} as const;

/**
 * Step B2 rules that are not balance numbers: reach, timings, monster AI factors (server-design §6, combat §5.2-6).
 * Values follow the browser prototype; the client uses them only to predict and display.
 */
export const RULES = {
  meleeReach: 72, // px in front of the body (Đòn Thường)
  rangeTolerance: 50, // px of lag allowance on every range check (server-design §6.1)
  burst: { ahead: 90, w: 120, h: 90 }, // Tụ Mana Chấn area
  gcdMs: 500, // combat §4.1, not on the basic attack
  cooldownToleranceMs: 100, // a press that arrives a little early still casts
  aggroDy: 120, // aggressive monsters only notice players within this height
  mobChase: 1.3, // speed factors of the monster move speed
  mobWander: 0.6,
  mobReturn: 1.5,
  mobFlee: 1.4,
  mobHurtMs: 220, // stagger after a hit
  mobKnockback: 90, // px/s during the stagger
  mobMeleeWindupMs: 220,
  mobMeleeHit: 56, // px: a melee swing still hits within this distance after the windup
  mobChargeStop: 30, // px: a charging monster (ai.charge) stops this far from its target
  mobShotWindupMs: 250,
  shotSpeed: 260, // px/s
  shotRange: 260, // px
  pickupX: 40,
  pickupY: 64,
  dropLockMs: 15_000, // combat §6: only the top damage dealer may pick up for 15 s
  dropTtlMs: 60_000,
  hazardPct: 0.08, // of max HP per touch of a hazard tile
  hazardEveryMs: 900,
  reviveInvulnMs: 1000, // combat §4.1, revive in town
  potionCooldownMs: 8000, // items §8
  expShareMin: 0.1, // combat §2.3: at least 10% of the damage to share the kill
  levelCapChapter1: 9, // quests §4: Lv10 opens after Q_MAIN_11
  zonesPerMap: 3,
  bagSize: 30,
} as const;

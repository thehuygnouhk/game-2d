import type { Rng } from "./combat";
import type { GearRarity } from "./loot";
import type { PlayerStats } from "./player";

/**
 * Equipment (docs/game-design/07-items-and-equipment.md §2-5) and classes (03-origins-classes-skills.md §3).
 * The server computes every number; the client uses the same functions only to display.
 */
export type GearSlot = "weapon" | "hat" | "armor" | "boots" | "tome";
/** Open slots of step B4; the index is item_instances.slot of location EQUIP. */
export const GEAR_SLOTS: readonly GearSlot[] = ["weapon", "hat", "armor", "boots", "tome"];

/** §2: rarity → stat multiplier, number of affixes, value multiplier (§4.1). */
export const RARITY: Record<GearRarity, { mult: number; affixes: number; value: number }> = {
  common: { mult: 1.0, affixes: 0, value: 1 },
  good: { mult: 1.2, affixes: 1, value: 2 },
  rare: { mult: 1.5, affixes: 2, value: 5 },
  epic: { mult: 1.9, affixes: 3, value: 15 },
};
export const RARITY_ORDER: GearRarity[] = ["common", "good", "rare", "epic"];

/** §2.2: the first six affix lines; each line at most once per item. */
export type AffixKey = "hp" | "mp" | "atkP" | "defP" | "crit" | "critDmg";
export const AFFIX_KEYS: readonly AffixKey[] = ["hp", "mp", "atkP", "defP", "crit", "critDmg"];
export const AFFIX_VALUE: Record<AffixKey, (L: number) => number> = {
  hp: (L) => 8 * L,
  mp: (L) => 5 * L,
  atkP: () => 0.03,
  defP: () => 0.03,
  crit: () => 0.01,
  critDmg: () => 0.05,
};
export type Affix = [AffixKey, number];

export function rollAffixes(rng: Rng, rarity: GearRarity, L: number): Affix[] {
  const pool = [...AFFIX_KEYS];
  const out: Affix[] = [];
  for (let i = 0; i < RARITY[rarity].affixes && pool.length; i++) {
    const k = pool.splice(Math.floor(rng() * pool.length), 1)[0]!;
    out.push([k, AFFIX_VALUE[k](L)]);
  }
  return out;
}

export interface GearMain {
  atk?: number;
  def?: number;
  hp?: number;
  mp?: number;
  /** run speed bonus (shown only: movement stays the shared physics, step B4) */
  spd?: number;
}

/** §4: main stats of an item of level L: base × rarity × (1 + 0.06 × enhance). */
export function gearMain(slot: GearSlot, L: number, rarity: GearRarity, enhance = 0): GearMain {
  const k = RARITY[rarity].mult * (1 + 0.06 * enhance);
  const r = (v: number) => Math.round(v * k);
  switch (slot) {
    case "weapon":
      return { atk: r(4 * L + 10) };
    case "hat":
      return { def: r(L + 2), mp: r(6 * L) };
    case "armor":
      return { def: r(1.6 * L + 4), hp: r(18 * L + 40) };
    case "boots":
      return { def: r(0.8 * L + 2), spd: 0.02 };
    case "tome":
      return { atk: r(1.5 * L + 5), mp: r(8 * L + 20) };
  }
}

/** §4.1: value of a gear item; NPCs buy at 25% (economy §3). */
export const gearValue = (L: number, rarity: GearRarity): number => (20 * L + 30) * RARITY[rarity].value;
export const SELL_RATIO = 0.25;
export const sellPrice = (value: number): number => Math.max(1, Math.floor(value * SELL_RATIO));

/** Classes chosen at the Lễ Khai Thư (classes §3): multipliers on the base stats. */
export type ClassId = "FIRE" | "WATER";
export const CLASS_MODS: Record<ClassId, { hp: number; mp: number; atk: number; def: number }> = {
  FIRE: { hp: 1, mp: 1, atk: 1.15, def: 0.95 },
  WATER: { hp: 1, mp: 1.2, atk: 1, def: 1 },
};
/** Class passives (classes §4). */
export const CLASS_PASSIVE = {
  /** Hỏa, Lửa Bén: +8% damage on a burning target; Hỏa Cầu burns for 20% ATK over 3 s */
  fire: { burningBonus: 0.08, burnMs: 3000, burnPct: 0.2, burnTicks: 3 },
  /** Thủy, Triều Dâng: every 5 hits, the next skill +15% and 3% MP back */
  water: { hits: 5, bonus: 0.15, mpPct: 0.03 },
} as const;
/** Free class change window after the ceremony (classes §5). */
export const CLASS_CHANGE_FREE_MS = 24 * 3600 * 1000;

export interface GearPiece {
  slot: GearSlot;
  level: number;
  rarity: GearRarity;
  affixes: Affix[];
  set?: string;
}

/** §5.1: set bonus by pieces worn (S1 Dân Làng). */
export function setBonus(n: number): { hpP: number; atkP: number; defP: number } {
  return { hpP: n >= 2 ? 0.05 : 0, atkP: n >= 4 ? 0.08 : 0, defP: n >= 4 ? 0.08 : 0 };
}

/**
 * combat §3.4: (origin + level + potential points) × class, + gear main stats and flat affixes,
 * then the % lines (affixes and set bonus, added together) multiply the total.
 */
export function withGear(base: PlayerStats, cls: ClassId | null, gear: GearPiece[]): PlayerStats & { spd: number } {
  const m = cls ? CLASS_MODS[cls] : { hp: 1, mp: 1, atk: 1, def: 1 };
  let hp = base.hp * m.hp,
    mp = base.mp * m.mp,
    atk = base.atk * m.atk,
    def = base.def * m.def,
    crit = base.crit,
    critDmg = base.critDmg,
    spd = 1,
    hpP = 0,
    atkP = 0,
    defP = 0;
  const sets = new Map<string, number>();
  for (const g of gear) {
    const s = gearMain(g.slot, g.level, g.rarity);
    hp += s.hp ?? 0;
    mp += s.mp ?? 0;
    atk += s.atk ?? 0;
    def += s.def ?? 0;
    spd += s.spd ?? 0;
    for (const [k, v] of g.affixes) {
      if (k === "hp") hp += v;
      else if (k === "mp") mp += v;
      else if (k === "atkP") atkP += v;
      else if (k === "defP") defP += v;
      else if (k === "crit") crit += v;
      else if (k === "critDmg") critDmg += v;
    }
    if (g.set) sets.set(g.set, (sets.get(g.set) ?? 0) + 1);
  }
  for (const n of sets.values()) {
    const b = setBonus(n);
    hpP += b.hpP;
    atkP += b.atkP;
    defP += b.defP;
  }
  return {
    lv: base.lv,
    hp: Math.round(hp * (1 + hpP)),
    mp: Math.round(mp),
    atk: Math.round(atk * (1 + atkP)),
    def: Math.round(def * (1 + defP)),
    crit: Math.min(0.5, crit),
    critDmg,
    spd,
  };
}

/**
 * Bosses (maps §5.2-5.3, §6.1): tier factors on the normal monster of the boss level.
 * World bosses of Chapter 1 ×40 HP/EXP; the DG01 mini-boss ×10, then the dungeon party scaling.
 */
export const BOSS_TIER = {
  BOSS: { hp: 40, atk: 1.5, def: 1.4, exp: 40, soft: 20 },
  MINIBOSS: { hp: 10, atk: 1.3, def: 1.2, exp: 10, soft: 8 },
} as const;
/** maps §6.1: party of n (1-5) in a dungeon. */
export function dungeonScale(n: number): { hp: number; atk: number; reward: number } {
  const k = Math.max(1, Math.min(5, n)) - 1;
  return { hp: 0.3 + 0.175 * k, atk: 0.7 + 0.075 * k, reward: [0.8, 0.9, 1, 1, 1][k]! };
}
/** maps §5.2: enrage doubles ATK. */
export const BOSS_ENRAGE_ATK = 2;
/** maps §5.2: players more than 10 levels above a world boss get no items. */
export const BOSS_REWARD_MAX_GAP = 10;

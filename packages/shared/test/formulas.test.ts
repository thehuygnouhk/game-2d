import { describe, expect, it } from "vitest";
import {
  combatPower,
  deathExpLoss,
  type DropTableData,
  expMod,
  expToNext,
  hitChance,
  mobBase,
  mobStats,
  mulberry32,
  playerStats,
  rollDamage,
  rollLoot,
  rollTier,
  suggestedPoints,
  totalPoints,
} from "../src";

// the R01 table of packages/content/drops/drop_r01_basic.yaml
const R01: DropTableData = {
  soft: { chance: 0.9, perLevel: 4, spread: 0.2 },
  entries: [
    { chance: 0.25, item: "dong_luyen_1" },
    { chance: 0.08, pick: { potion_hp: 0.6, potion_mp: 0.4 } },
  ],
  gear: {
    items: ["s1_weapon", "s1_hat", "s1_armor", "s1_boots"],
    levelBand: [1, 9],
    chance: { common: 0.06, good: 0.02, rare: 0.003, epic: 0.0003 },
  },
  tiers: {
    elite: { softChance: 1, rolls: 2, gear: { common: 0.06, good: 0.1, rare: 0.015, epic: 0.0015 } },
    leader: {
      softChance: 1,
      rolls: 2,
      gear: { common: 0.06, good: 0.25, rare: 0.05, epic: 0.005 },
      guaranteed: "dong_luyen_2",
    },
  },
};
const VILLAGER = { base: [220, 70, 22, 9], growth: [14, 4, 1.8, 0.9] } as const;

describe("combat formulas (combat §2-7)", () => {
  it("matches the EXP and monster tables", () => {
    expect([1, 5, 10, 20, 99].map(expToNext)).toEqual([150, 1750, 6000, 22000, 499950]);
    expect(mobBase(10)).toEqual({ hp: 726, atk: 40, def: 25, exp: 90, soft: 40 });
    expect(mobBase(1)).toMatchObject({ hp: 52, atk: 11, def: 3, exp: 18 }); // round(2.5) = 3, like the prototype
    expect(mobStats(5, "leader")).toEqual({
      hp: Math.round(276 * 6),
      atk: Math.round(24 * 1.6),
      def: Math.round(13 * 1.4),
      exp: 300,
    });
    expect(deathExpLoss(10)).toBe(120);
  });
  it("scales EXP by level difference", () => {
    expect([-6, -5, -2, 0, 5, 6, 10, 20].map(expMod)).toEqual([1.5, 1.5, 1.2, 1, 1, 0.85, 0.25, 0.1]);
  });
  it("rolls hits, crits and misses inside the documented bounds", () => {
    const rng = mulberry32(7);
    const a = { atk: 40, lv: 5, crit: 0.05, critDmg: 1.5 },
      t = { def: 13, lv: 5 };
    expect(hitChance(a, t)).toBe(0.95);
    expect(hitChance(a, { def: 0, lv: 60 })).toBe(0.3);
    let miss = 0,
      crit = 0,
      min = 1e9,
      max = 0;
    for (let i = 0; i < 20000; i++) {
      const h = rollDamage(rng, a, t, 1);
      if (h.miss) miss++;
      else {
        if (h.crit) crit++;
        else {
          min = Math.min(min, h.amount);
          max = Math.max(max, h.amount);
        }
      }
    }
    const defRed = 13 / (13 + 15 * 5 + 100);
    expect(min).toBeGreaterThanOrEqual(Math.round(40 * (1 - defRed) * 0.95));
    expect(max).toBeLessThanOrEqual(Math.round(40 * (1 - defRed) * 1.05));
    expect(miss / 20000).toBeCloseTo(0.05, 1);
    expect(crit / 20000).toBeCloseTo(0.0475, 1);
    // same seed, same rolls: the server log and simulations can be replayed
    expect(rollDamage(mulberry32(1), a, t, 1.2)).toEqual(rollDamage(mulberry32(1), a, t, 1.2));
  });
  it("rolls elite and leader monsters at about 1/15 and 1/60", () => {
    const rng = mulberry32(3),
      n = 60000,
      c = { normal: 0, elite: 0, leader: 0 };
    for (let i = 0; i < n; i++) c[rollTier(rng, false)]++;
    expect(c.leader / n).toBeCloseTo(1 / 60, 2);
    expect(c.elite / n).toBeCloseTo((59 / 60) * (1 / 15), 2);
    for (let i = 0; i < 1000; i++) expect(rollTier(rng, true)).not.toBe("leader");
  });
});

describe("player stats (combat §3)", () => {
  it("adds 5 potential points per level and suggests 2 HP, 2 ATK, 1 DEF per 5", () => {
    expect(totalPoints(1)).toBe(10);
    expect(totalPoints(10)).toBe(55);
    expect(suggestedPoints(10)).toEqual({ hp: 4, mp: 0, atk: 4, def: 2, crit: 0 });
  });
  it("computes origin stats with points", () => {
    const s = playerStats(1, VILLAGER, suggestedPoints(10));
    expect(s).toEqual({ lv: 1, hp: 340, mp: 70, atk: 34, def: 13, crit: 0.05, critDmg: 1.5 });
    const s9 = playerStats(9, VILLAGER, suggestedPoints(totalPoints(9)));
    expect(s9.atk).toBe(Math.round(22 + 1.8 * 8 + 20 * 3));
    expect(combatPower(s, 1)).toBe(Math.round(34 + 3.5 + 136 + 39 + 50 + 0 + 20));
  });
});

describe("drops (combat §6, §2.1.1)", () => {
  it("follows the R01 table rates", () => {
    const rng = mulberry32(11),
      n = 40000;
    let soft = 0,
      mat = 0,
      pot = 0,
      gear = 0;
    for (let i = 0; i < n; i++)
      for (const l of rollLoot(rng, R01, 3, "normal")) {
        if (l.kind === "soft") {
          soft++;
          expect(l.qty).toBeGreaterThanOrEqual(Math.round(12 * 0.8));
          expect(l.qty).toBeLessThanOrEqual(Math.round(12 * 1.2));
        } else if (l.kind === "item") {
          if (l.item === "dong_luyen_1") mat++;
          else pot++;
        } else {
          gear++;
          expect(l.level).toBe(3);
        }
      }
    expect(soft / n).toBeCloseTo(0.9, 1);
    expect(mat / n).toBeCloseTo(0.25, 1);
    expect(pot / n).toBeCloseTo(0.08, 1);
    expect(gear / n).toBeCloseTo(0.0833, 2);
  });
  it("always drops Quan and at least one item from a leader", () => {
    const rng = mulberry32(5);
    for (let i = 0; i < 500; i++) {
      const l = rollLoot(rng, R01, 8, "leader");
      expect(l.some((x) => x.kind === "soft")).toBe(true);
      expect(l.some((x) => x.kind !== "soft")).toBe(true);
    }
  });
});

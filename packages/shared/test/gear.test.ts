import { describe, expect, it } from "vitest";
import { dungeonScale, gearMain, gearValue, mulberry32, playerStats, rollAffixes, sellPrice, withGear } from "../src";

// docs/game-design/07-items-and-equipment.md §2-5, combat §3.4, maps §6.1
describe("gear", () => {
  it("main stats follow items §4 with the rarity multiplier", () => {
    expect(gearMain("weapon", 1, "common")).toEqual({ atk: 14 });
    expect(gearMain("hat", 4, "good")).toEqual({ def: 7, mp: 29 });
    expect(gearMain("armor", 9, "good")).toEqual({ def: 22, hp: 242 });
    expect(gearMain("tome", 10, "common")).toEqual({ atk: 20, mp: 100 });
  });
  it("values and sell prices follow items §4.1 (Mũ Lv4 Tốt: 220, sells for 55)", () => {
    expect(gearValue(4, "good")).toBe(220);
    expect(sellPrice(220)).toBe(55);
    expect(sellPrice(1)).toBe(1);
  });
  it("rolls one affix line per rarity step, each line once", () => {
    const rng = mulberry32(3);
    expect(rollAffixes(rng, "common", 5)).toEqual([]);
    const epic = rollAffixes(rng, "epic", 5);
    expect(epic).toHaveLength(3);
    expect(new Set(epic.map(([k]) => k)).size).toBe(3);
  });
  it("adds gear, class multipliers and the S1 set bonus", () => {
    const base = playerStats(
      10,
      { base: [220, 70, 22, 9], growth: [14, 4, 1.8, 0.9] },
      { hp: 0, mp: 0, atk: 0, def: 0, crit: 0 },
    );
    const naked = withGear(base, null, []);
    expect(naked).toMatchObject({ hp: base.hp, atk: base.atk, spd: 1 });
    const fire = withGear(base, "FIRE", []);
    expect(fire.atk).toBe(Math.round(base.atk * 1.15));
    expect(withGear(base, "WATER", []).mp).toBe(Math.round(base.mp * 1.2));
    const s1 = (slot: "weapon" | "hat" | "armor" | "boots") => ({
      slot,
      level: 9,
      rarity: "common" as const,
      affixes: [],
      set: "S1",
    });
    const two = withGear(base, null, [s1("weapon"), s1("hat")]);
    expect(two.hp).toBe(Math.round(base.hp * 1.05));
    const four = withGear(base, null, [s1("weapon"), s1("hat"), s1("armor"), s1("boots")]);
    expect(four.atk).toBe(Math.round((base.atk + 46) * 1.08));
    expect(four.spd).toBeCloseTo(1.02);
  });
  it("scales dungeons by party size (maps §6.1)", () => {
    expect(dungeonScale(1)).toEqual({ hp: 0.3, atk: 0.7, reward: 0.8 });
    expect(dungeonScale(5).hp).toBeCloseTo(1);
  });
});

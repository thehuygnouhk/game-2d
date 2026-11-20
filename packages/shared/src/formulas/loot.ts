import { type Rng, TIER, type Tier } from "./combat";

/** Drop roll: docs/game-design/04-combat-and-progression.md §6 and §2.1.1 (table data: packages/content/drops). */
export type GearRarity = "common" | "good" | "rare" | "epic";
type RarityChance = Record<GearRarity, number>;
/** Structural copy of the content DropTable, so the client bundle does not need the content package. */
export interface DropTableData {
  soft: { chance: number; perLevel: number; spread: number };
  entries: { chance: number; item?: string; pick?: Record<string, number>; qty?: [number, number] }[];
  gear: { items: string[]; levelBand: [number, number]; chance: RarityChance };
  tiers: Record<"elite" | "leader", { softChance: number; rolls: number; gear: RarityChance; guaranteed?: string }>;
}

export type Loot =
  | { kind: "soft"; qty: number }
  | { kind: "item"; item: string; qty: number }
  | { kind: "gear"; item: string; level: number; rarity: GearRarity };

const RARITIES: GearRarity[] = ["epic", "rare", "good", "common"];

export function rollLoot(rng: Rng, t: DropTableData, L: number, tier: Tier): Loot[] {
  const out: Loot[] = [];
  const extra = tier === "normal" ? null : t.tiers[tier];
  if (rng() < (extra?.softChance ?? t.soft.chance)) {
    const spread = 1 - t.soft.spread + rng() * 2 * t.soft.spread;
    out.push({ kind: "soft", qty: Math.max(1, Math.round(t.soft.perLevel * L * TIER[tier].soft * spread)) });
  }
  for (let r = 0; r < (extra?.rolls ?? 1); r++)
    for (const e of t.entries) {
      if (rng() >= e.chance) continue;
      let item = e.item;
      if (!item && e.pick) {
        let x = rng();
        for (const [id, p] of Object.entries(e.pick)) {
          item = id;
          if ((x -= p) < 0) break;
        }
      }
      const [lo, hi] = e.qty ?? [1, 1];
      if (item) out.push({ kind: "item", item, qty: lo + Math.floor(rng() * (hi - lo + 1)) });
    }
  const chance = extra?.gear ?? t.gear.chance;
  let g = rng();
  for (const rarity of RARITIES) {
    if ((g -= chance[rarity]) < 0) {
      const item = t.gear.items[Math.floor(rng() * t.gear.items.length)]!;
      const level = Math.min(t.gear.levelBand[1], Math.max(t.gear.levelBand[0], L));
      out.push({ kind: "gear", item, level, rarity });
      break;
    }
  }
  if (extra?.guaranteed && !out.some((o) => o.kind !== "soft"))
    out.push({ kind: "item", item: extra.guaranteed, qty: 1 });
  return out;
}

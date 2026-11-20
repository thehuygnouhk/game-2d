import { z } from "zod";

/**
 * Zod schemas for the content records the online game reads (docs/workflows/content-pipeline.md §3).
 * Rule V001: every YAML file must match the schema of its kind. Unknown fields are kept (passthrough) so
 * designer notes and fields for later steps do not break the validator.
 */
const Range = z.tuple([z.number().int(), z.number().int()]).refine(([a, b]) => a <= b, "range is [min, max]");

export const Monster = z
  .object({
    id: z.string().regex(/^MOB\d{3}$/),
    nameKey: z.string(),
    level: Range,
    element: z.enum(["NONE", "FIRE", "WATER", "WIND", "BOLT", "EARTH", "PLANT", "DARK"]),
    kind: z.enum(["NORMAL", "ELITE", "MINIBOSS", "BOSS", "MINION"]),
    sprite: z.string(),
    size: z.object({ w: z.number().positive(), h: z.number().positive() }),
    ai: z
      .object({
        type: z.enum(["PASSIVE", "AGGRESSIVE", "PACK"]),
        aggroRange: z.number().nonnegative(),
        leash: z.number().positive(),
        moveSpeed: z.number().nonnegative(),
        flying: z.boolean().default(false),
        fleeBelowHp: z.number().min(0).max(1).default(0),
        attackRange: z.number().positive(),
        attackCooldownMs: z.number().int().positive(),
      })
      .passthrough(),
    skills: z.array(z.string()),
    drops: z.string(),
  })
  .passthrough();
export type Monster = z.infer<typeof Monster>;

export const Rarity = z.enum(["common", "good", "rare", "epic"]);
export type Rarity = z.infer<typeof Rarity>;

export const Item = z
  .object({
    id: z.string().regex(/^[a-z0-9_]+$/),
    type: z.enum(["WEAPON", "ARMOR", "TOME", "CONSUMABLE", "MATERIAL", "MISC", "QUEST"]),
    nameKey: z.string(),
    icon: z.string(),
    slot: z.enum(["weapon", "hat", "armor", "boots", "tome"]).optional(),
    set: z.string().optional(),
    value: z.number().int().nonnegative().optional(),
    healHp: z.number().int().positive().optional(),
    healMp: z.number().int().positive().optional(),
    stack: z.number().int().positive().optional(),
    levelBand: Range.optional(),
  })
  .passthrough();
export type Item = z.infer<typeof Item>;

/** base/growth: HP, MP, ATK, DEF (classes §2). */
const Quad = z.tuple([z.number(), z.number(), z.number(), z.number()]);
export const OriginDef = z.object({ nameKey: z.string(), base: Quad, growth: Quad, passiveKey: z.string() });
export const Origins = z.object({ VILLAGER: OriginDef, NOBLE: OriginDef, ANCIENT: OriginDef });
export type Origins = z.infer<typeof Origins>;

export const Skill = z
  .object({
    id: z.string().regex(/^SKL_[A-Z0-9_]+$/),
    nameKey: z.string(),
    unlockLevel: z.number().int().min(1).max(100),
    mp: z.number().int().nonnegative(),
    cooldownSec: z.number().positive(),
    atkMult: z.number().positive(),
    shape: z.string(),
    gcd: z.boolean().default(true),
  })
  .passthrough();
export type Skill = z.infer<typeof Skill>;
export const SkillSet = z.object({ id: z.string(), nameKey: z.string(), skills: z.array(Skill) }).passthrough();
export type SkillSet = z.infer<typeof SkillSet>;

const RarityChance = z.object({
  common: z.number().min(0).max(1),
  good: z.number().min(0).max(1),
  rare: z.number().min(0).max(1),
  epic: z.number().min(0).max(1),
});
export const DropEntry = z
  .object({
    chance: z.number().min(0).max(1),
    item: z.string().optional(),
    pick: z.record(z.number().min(0).max(1)).optional(),
    qty: Range.optional(),
  })
  .refine((e) => !!e.item !== !!e.pick, "an entry has either item or pick");
export const TierDrops = z.object({
  softChance: z.number().min(0).max(1),
  rolls: z.number().int().min(1),
  gear: RarityChance,
  guaranteed: z.string().optional(),
});
export const DropTable = z.object({
  id: z.string().regex(/^DROP_[A-Z0-9_]+$/),
  soft: z.object({ chance: z.number().min(0).max(1), perLevel: z.number().positive(), spread: z.number().min(0) }),
  entries: z.array(DropEntry),
  gear: z.object({ items: z.array(z.string()).min(1), levelBand: Range, chance: RarityChance }),
  tiers: z.object({ elite: TierDrops, leader: TierDrops }),
});
export type DropTable = z.infer<typeof DropTable>;

export const MapMeta = z
  .object({
    id: z.string().regex(/^(M\d{3}|DG\d{2}|I\d{3})$/),
    nameKey: z.string(),
    type: z.enum(["TOWN", "FIELD", "DUNGEON", "RAID", "PVP", "HALL", "INSTANCE"]),
    region: z.string(),
    levelRange: Range,
    tmj: z.string(),
    pk: z.enum(["PEACE", "OPTIONAL", "FORCED"]),
    zoneCap: z.number().int().positive().optional(),
  })
  .passthrough();
export type MapMeta = z.infer<typeof MapMeta>;

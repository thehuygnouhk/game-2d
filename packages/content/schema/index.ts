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
    /** named gear (quest rewards, class weapons): its level and rarity */
    levelReq: z.number().int().min(1).optional(),
    rarity: Rarity.optional(),
    /** only this class may wear it */
    class: z.enum(["FIRE", "WATER"]).optional(),
    bind: z.enum(["BOP", "BOE"]).optional(),
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
export const SkillSet = z
  .object({
    id: z.string(),
    nameKey: z.string(),
    skills: z.array(Skill),
    /** classes (FIRE, WATER): rite window texts and the class weapon given at the ceremony */
    roleKey: z.string().optional(),
    weaponKey: z.string().optional(),
    modsKey: z.string().optional(),
    passiveKey: z.string().optional(),
    passiveTextKey: z.string().optional(),
    weapon: z.string().optional(),
  })
  .passthrough();
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

/* ---------------- step B4: quests, NPCs, shops, bosses, events, dungeons, scenes ---------------- */
export const QuestObjective = z.object({
  type: z.enum(["TALK", "KILL", "COLLECT", "USE_SKILL", "BOSS", "SCENE", "REACH"]),
  target: z.string(),
  count: z.number().int().positive().default(1),
  map: z.string(),
});
export const Quest = z
  .object({
    id: z.string().regex(/^Q_[A-Z0-9_]+$/),
    type: z.enum(["MAIN", "SIDE", "DAILY"]),
    nameKey: z.string(),
    chapter: z.number().int().positive(),
    levelMin: z.number().int().min(1),
    prerequisites: z.array(z.string()),
    giver: z.string(),
    turnIn: z.string(),
    objectives: z.array(QuestObjective).min(1),
    rewards: z
      .object({
        exp: z.number().int().nonnegative().default(0),
        soft: z.number().int().nonnegative().default(0),
        items: z.array(z.object({ id: z.string(), count: z.number().int().positive() })).default([]),
        skill: z.string().optional(),
      })
      .default({}),
    dialogue: z.object({ accept: z.string(), progress: z.string(), complete: z.string() }),
  })
  .passthrough();
export type Quest = z.infer<typeof Quest>;

/** quests §4.1: where quest items come from (counted in the quest, not kept in the bag). */
export const QuestItemSource = z.union([
  z.object({ mob: z.string(), chance: z.number().min(0).max(1) }),
  z.object({
    node: z.string(),
    respawnSec: z.number().positive(),
    cols: z.array(z.number().int().nonnegative()).min(1),
  }),
]);
export const QuestItems = z.record(QuestItemSource);
export type QuestItems = z.infer<typeof QuestItems>;

export const Npc = z.object({
  id: z.string().regex(/^NPC\d{3}$/),
  nameKey: z.string(),
  lineKey: z.string(),
  face: z.number().int().nonnegative(),
});
export type Npc = z.infer<typeof Npc>;
export const NpcFile = z.object({ npcs: z.array(Npc) });

export const Shop = z.object({
  npc: z.string(),
  nameKey: z.string(),
  currency: z.literal("SOFT"),
  sells: z.array(z.string()).min(1),
  buyBack: z.object({ ratio: z.number(), windowMin: z.number() }).optional(),
});
export type Shop = z.infer<typeof Shop>;

export const BossSkillDef = z
  .object({
    mult: z.number().positive().default(1),
    telegraphMs: z.number().int().nonnegative().default(0),
    shape: z.enum(["rect", "circle", "circles"]).optional(),
    w: z.number().positive().optional(),
    h: z.number().positive().optional(),
    r: z.number().positive().optional(),
    count: z.number().int().positive().optional(),
    /** every n-th attack of the boss */
    every: z.number().int().positive().optional(),
    cooldownMs: z.number().int().positive().optional(),
    atHp: z.number().min(0).max(1).optional(),
    pieceHp: z.number().min(0).max(1).optional(),
  })
  .passthrough();
export type BossSkillDef = z.infer<typeof BossSkillDef>;
export const Boss = z
  .object({
    id: z.string().regex(/^BOSS\d{3}(_SHARD)?$/),
    nameKey: z.string(),
    level: Range,
    element: z.string(),
    kind: z.enum(["BOSS", "MINIBOSS", "MINION"]),
    sprite: z.string(),
    size: z.object({ w: z.number().positive(), h: z.number().positive() }),
    flying: z.boolean().default(false),
    moveSpeed: z.number().nonnegative().default(60),
    aggroRange: z.number().nonnegative().default(600),
    skills: z.array(z.string()),
    skillDefs: z.record(BossSkillDef).default({}),
    phases: z
      .array(
        z.object({
          atHp: z.number().min(0).max(1),
          action: z.enum(["SPLIT", "SUMMON"]),
          mob: z.string().optional(),
          into: z.string().optional(),
          count: z.number().int().positive(),
        }),
      )
      .default([]),
    instanceOnly: z.string().optional(),
    drops: z.string().optional(),
    enrageAfterMin: z.number().positive().optional(),
  })
  .passthrough();
export type Boss = z.infer<typeof Boss>;

const HHMM = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
export const BossEvent = z.object({
  id: z.string().regex(/^EVT_[A-Z0-9_]+$/),
  kind: z.literal("WORLD_BOSS"),
  boss: z.string(),
  schedule: z.union([
    z.object({ times: z.array(HHMM).min(1), tz: z.string() }),
    z.object({
      weekly: z.object({
        day: z.enum(["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"]),
        from: HHMM,
        to: HHMM,
        everyMin: z.number().int().positive(),
      }),
      tz: z.string(),
    }),
  ]),
  announceBeforeMin: z.number().nonnegative(),
  maps: z.array(z.string()).min(1),
  zones: z.enum(["RANDOM_ONE", "ALL"]),
  despawnAfterMin: z.number().positive(),
  rewardMaxLevelGap: z.number().int().nonnegative(),
});
export type BossEvent = z.infer<typeof BossEvent>;

export const Dungeon = z.object({
  id: z.string().regex(/^DG\d{2}$/),
  nameKey: z.string(),
  minLevel: z.number().int().min(1),
  timeLimitMin: z.number().positive(),
  boss: z.string(),
  wakeRange: z.number().positive(),
  entry: z.object({ map: z.string(), x: z.number(), y: z.number() }),
  chest: z.object({
    soft: z.number().int().nonnegative(),
    items: z.array(z.object({ id: z.string(), count: z.number().int().positive() })),
    gear: z.object({ items: z.array(z.string()).min(1), level: z.number().int().min(1), rarity: Rarity }),
  }),
});
export type Dungeon = z.infer<typeof Dungeon>;

export const Scene = z.object({
  id: z.string(),
  lines: z.array(z.object({ who: z.string(), textKey: z.string() })).min(1),
  letterKey: z.string().optional(),
});
export type Scene = z.infer<typeof Scene>;
export const SceneFile = z.object({ scenes: z.array(Scene) });

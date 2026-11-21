import { z } from "zod";
import type { Tier } from "../formulas/combat";
import { Op } from "./opcodes";

/**
 * Payload schemas for the protocol slice in use (docs/architecture/network-protocol.md §3, §5, §6).
 * Every client payload is validated on the server; server payloads are typed for the client.
 */
export const Appearance = z.object({
  origin: z.enum(["VILLAGER", "NOBLE", "ANCIENT"]),
  gender: z.enum(["MALE", "FEMALE"]),
});
export type Appearance = z.infer<typeof Appearance>;

/** Character names follow docs/game-design/03-origins-classes-skills.md §2.1. */
export const CharacterName = z
  .string()
  .transform((s) => s.trim().replace(/\s+/g, " "))
  .pipe(
    z
      .string()
      .min(3)
      .max(12)
      .regex(/^[\p{L}\p{N}]+( [\p{L}\p{N}]+)*$/u),
  );

export const CHello = z.object({
  ticket: z.string().min(1).max(256),
  clientVersion: z.string().max(32),
  protocolVersion: z.number().int(),
  contentVersion: z.string().max(64).default("dev"),
  device: z.string().max(64).default("web"),
  appearance: Appearance.optional(),
});
export type CHello = z.infer<typeof CHello>;

const bit = z.union([z.literal(0), z.literal(1)]);
export const CMoveInput = z.object({
  seq: z.number().int().nonnegative(),
  dir: z.union([z.literal(-1), z.literal(0), z.literal(1)]),
  jump: bit,
  down: bit,
  up: bit.default(0),
  tickClient: z.number().int().nonnegative(),
});
export type CMoveInput = z.infer<typeof CMoveInput>;

export const CPing = z.object({ t: z.number() });
export const CEnterWorld = z.object({}).passthrough();
const EntityId = z.number().int().nonnegative();
/** `seq` = last C_MOVE_INPUT seq: the server moves the player after that input (the client pauses input meanwhile). */
export const CUsePortal = z.object({ portalId: z.string().max(16), seq: z.number().int().nonnegative() });
export const CChangeZone = z.object({ zoneNo: z.number().int().min(1).max(99) });
export const CRequestZones = z.object({}).passthrough();
/** `seq` = the client's last C_MOVE_INPUT seq when the skill was pressed: the server casts after that move. */
export const CUseSkill = z.object({
  skillId: z.string().max(32),
  targetId: EntityId.optional(),
  seq: z.number().int().nonnegative(),
});
export type CUseSkill = z.infer<typeof CUseSkill>;
export const CRevive = z.object({ mode: z.literal("TOWN"), idemKey: z.string().max(64).optional() });
export const CUseItem = z.object({ instanceId: z.string().max(40) });
export const CPickup = z.object({ dropId: EntityId });
/** Chat text: 1-120 characters after trimming, no control characters (security §chat; shown with textContent). */
export const ChatText = z
  .string()
  .max(400)
  .transform((s) => s.replace(/\s+/g, " ").trim())
  .pipe(
    z
      .string()
      .min(1)
      .max(120)
      .refine((s) => !/\p{Cc}/u.test(s), "control characters"),
  );
export const CChatSend = z.object({ channel: z.enum(["MAP", "WORLD"]), text: ChatText });
const Pts = z.number().int().min(0).max(500);
export const CAllocatePoints = z
  .object({ hp: Pts, mp: Pts, atk: Pts, def: Pts, crit: Pts })
  .refine((p) => p.hp + p.mp + p.atk + p.def + p.crit > 0, "spend at least one point");
export type CAllocatePoints = z.infer<typeof CAllocatePoints>;

export const ClientSchemas: Record<number, z.ZodTypeAny> = {
  [Op.C_HELLO]: CHello,
  [Op.C_PING]: CPing,
  [Op.C_ENTER_WORLD]: CEnterWorld,
  [Op.C_MOVE_INPUT]: CMoveInput,
  [Op.C_USE_PORTAL]: CUsePortal,
  [Op.C_CHANGE_ZONE]: CChangeZone,
  [Op.C_REQUEST_ZONES]: CRequestZones,
  [Op.C_USE_SKILL]: CUseSkill,
  [Op.C_REVIVE]: CRevive,
  [Op.C_USE_ITEM]: CUseItem,
  [Op.C_PICKUP]: CPickup,
  [Op.C_CHAT_SEND]: CChatSend,
  [Op.C_ALLOCATE_POINTS]: CAllocatePoints,
};

/** Animation state carried in snapshots (`st`). Ground states are < 2. */
export const MoveState = { IDLE: 0, RUN: 1, JUMP: 2, FALL: 3, CLIMB: 4, DEAD: 5 } as const;
/** HP in snapshots and spawns: share of max HP scaled to 0-255 (u8). */
export const hpByte = (hp: number, max: number): number =>
  hp <= 0 ? 0 : Math.max(1, Math.min(255, Math.round((255 * hp) / Math.max(1, max))));

export interface SWelcome {
  serverTime: number;
  tickRate: number;
  snapshotRate: number;
  resumeToken: string;
  config: { mapId: string };
}
export interface PlayerSpawn {
  id: number;
  kind: "player";
  name: string;
  appearance: Appearance;
  lv: number;
  x: number;
  y: number;
  st: number;
  f: 1 | -1;
  hp: number;
}
export interface MobSpawn {
  id: number;
  kind: "mob";
  templateId: string;
  name: string;
  lv: number;
  tier: Tier;
  flying: boolean;
  x: number;
  y: number;
  st: number;
  f: 1 | -1;
  hp: number;
}
export type EntitySpawn = PlayerSpawn | MobSpawn;
export interface EntityDelta {
  id: number;
  x?: number;
  y?: number;
  vy?: number; // int8 x 8 (px/s)
  st?: number;
  f?: 1 | -1;
  hp?: number; // 0-255
}
/** What a drop or a bag slot holds. */
export interface ItemSummary {
  kind: "soft" | "item" | "gear";
  item?: string;
  name: string;
  icon?: string;
  qty: number;
  level?: number;
  rarity?: "common" | "good" | "rare" | "epic";
}
export interface SDropSpawn {
  id: number;
  x: number;
  y: number;
  what: ItemSummary;
  /** only this player may pick it up for `lockedMs` more milliseconds (combat §6) */
  ownerId: number;
  lockedMs: number;
}
export interface BagItem extends ItemSummary {
  instanceId: string;
  healHp?: number;
  healMp?: number;
}
export interface StatsFull {
  lv: number;
  exp: number;
  expNext: number;
  hp: number;
  mp: number;
  maxHp: number;
  maxMp: number;
  atk: number;
  def: number;
  crit: number;
  power: number;
  /** free potential points and the points spent per stat (combat §3.3) */
  statPoints: number;
  pts: { hp: number; mp: number; atk: number; def: number; crit: number };
}
export type SStatsUpdate = Partial<StatsFull> & {
  /** Dân Làng passive Không Lùi Bước switched on for this many ms */
  rallyMs?: number;
};
export interface SkillInfo {
  id: string;
  name: string;
  unlockLevel: number;
  mp: number;
  cooldownMs: number;
}
export interface MapInfo {
  id: string;
  zone: number;
  name: string;
}
export interface SMapChange {
  map: MapInfo;
  tick: number;
  /** last C_MOVE_INPUT seq applied before the move */
  ack: number;
  body: { x: number; y: number; vy: number; st: number };
  entities: EntitySpawn[];
  drops: SDropSpawn[];
}
export interface SEnterWorld extends SMapChange {
  you: number;
  character: { name: string; appearance: Appearance };
  stats: StatsFull;
  skills: SkillInfo[];
  bag: { soft: number; items: BagItem[]; size: number };
}
export interface SSnapshot {
  tick: number;
  ack: number;
  ents: EntityDelta[];
}
export interface SEntityDespawn {
  ids: number[];
}
export interface SError {
  code: number;
  refSeq: number;
  message?: string;
}
export interface SZoneList {
  mapId: string;
  zones: { zoneNo: number; players: number; cap: number }[];
}
export interface SSkillCast {
  casterId: number;
  skillId: string;
  f: 1 | -1;
  targetId?: number;
  /** ranged monster attacks: a visible shot flying at vx px/s for `range` px */
  shot?: { vx: number; range: number; delayMs: number };
}
export interface SDamage {
  targetId: number;
  sourceId: number;
  amount: number;
  crit: boolean;
  miss: boolean;
  hp: number; // target HP after the hit, 0-255
}
export interface SHeal {
  targetId: number;
  sourceId: number;
  amount: number;
  kind: "hp" | "mp";
}
export interface SEntityDied {
  id: number;
  killerId: number;
  /** for the killer(s): EXP gained from this kill */
  exp?: number;
}
export interface SRevived {
  x: number;
  y: number;
  hp: number;
  mp: number;
}
export interface SInventoryDelta {
  soft: number;
  add: BagItem[];
  update: { instanceId: string; qty: number }[];
  remove: string[];
  /** what was just picked up, for the pickup text */
  picked?: ItemSummary;
}
export interface SChatMsg {
  channel: "MAP" | "WORLD" | "SYSTEM";
  fromId: number;
  fromName: string;
  text: string;
  time: number;
}
export interface SKick {
  reason: "DUPLICATE_LOGIN" | "SHUTDOWN";
  message: string;
}
export interface SLevelUp {
  level: number;
  statPoints: number;
}

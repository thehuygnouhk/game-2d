import { z } from "zod";
import type { Tier } from "../formulas/combat";
import type { Affix, ClassId, GearMain, GearSlot } from "../formulas/gear";
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

const Id = z.string().min(1).max(40);
const IdemKey = z.string().uuid();
export const CEquip = z.object({ instanceId: z.string().max(40) });
export const CUnequip = z.object({ slot: z.enum(["weapon", "hat", "armor", "boots", "tome"]) });
export const CNpcInteract = z.object({ npcId: Id });
export const CNpcChoice = z.object({ npcId: Id, optionId: z.string().min(1).max(40) });
/** a map object: "HERB:<n>" (quest herbs), "CHEST" (dungeon chest), "ALTAR" (Đài Khai Thư) */
export const CUseObject = z.object({ objectId: z.string().min(1).max(24) });
export const CChooseClass = z.object({ classId: z.enum(["FIRE", "WATER"]) });
export const CShopBuy = z.object({
  shopId: Id,
  itemId: Id,
  qty: z.number().int().min(1).max(99),
  idemKey: IdemKey,
});
export const CShopSell = z.object({
  instanceId: z.string().max(40),
  qty: z.number().int().min(1).max(9999),
  idemKey: IdemKey,
});
export const CLeaveInstance = z.object({}).passthrough();

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
  [Op.C_EQUIP]: CEquip,
  [Op.C_UNEQUIP]: CUnequip,
  [Op.C_NPC_INTERACT]: CNpcInteract,
  [Op.C_NPC_CHOICE]: CNpcChoice,
  [Op.C_USE_OBJECT]: CUseObject,
  [Op.C_CHOOSE_CLASS]: CChooseClass,
  [Op.C_SHOP_BUY]: CShopBuy,
  [Op.C_SHOP_SELL]: CShopSell,
  [Op.C_LEAVE_INSTANCE]: CLeaveInstance,
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
  /** class chosen at the Lễ Khai Thư (step B4): the look follows it */
  cls?: ClassId;
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
  /** world boss, dungeon boss or one of its pieces (step B4): sprite and name plate of a boss */
  boss?: boolean;
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
  /** item kind for the bag tabs */
  type?: "WEAPON" | "ARMOR" | "TOME" | "CONSUMABLE" | "MATERIAL" | "MISC" | "QUEST";
  /** gear: the slot it goes in, its main stats, affix lines, set, class lock (step B4) */
  slot?: GearSlot;
  main?: GearMain;
  affixes?: Affix[];
  set?: string;
  cls?: ClassId;
  /** cannot be taken off or sold (Huyền Thư) */
  bound?: boolean;
  /** what an NPC pays for one (25% of the value); absent: cannot be sold */
  sell?: number;
}
export type Equipment = Partial<Record<GearSlot, BagItem>>;
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
  /** run speed bonus from boots (shown only) */
  spd?: number;
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
  /** hotbar key: J, 1, 2, 3, 4 */
  key?: string;
  /** area shape for the client effect: melee, burst, bolt, slash, lance, wave, beam */
  shape?: string;
}
export interface MapInfo {
  id: string;
  zone: number;
  name: string;
}
export interface NpcInfo {
  id: string;
  name: string;
  /** row of sprites/npc_idle.png */
  face: number;
  x: number;
  y: number;
}
export interface SMapChange {
  map: MapInfo;
  /** NPCs standing on this map (step B4) */
  npcs: NpcInfo[];
  tick: number;
  /** last C_MOVE_INPUT seq applied before the move */
  ack: number;
  body: { x: number; y: number; vy: number; st: number };
  entities: EntitySpawn[];
  drops: SDropSpawn[];
}
export interface SEnterWorld extends SMapChange {
  you: number;
  character: { name: string; appearance: Appearance; cls: ClassId | null };
  stats: StatsFull;
  skills: SkillInfo[];
  bag: { soft: number; items: BagItem[]; size: number };
  equipment: Equipment;
  quests: SQuestUpdate;
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
  /** equipment slots that changed: the item now worn, or null when emptied (step B4) */
  equip?: Partial<Record<GearSlot, BagItem | null>>;
  /** gained without a drop (quest reward, shop, chest), for the log */
  gained?: ItemSummary[];
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

/* ---------------- step B4: NPCs, quests, shop, classes, bosses, instances ---------------- */
export interface QuestObjectiveView {
  type: "TALK" | "KILL" | "COLLECT" | "USE_SKILL" | "BOSS" | "SCENE" | "REACH";
  target: string;
  label: string;
  count: number;
  got: number;
  map: string;
  mapName: string;
  /** where to find it, for the quest window */
  where: string;
  /** x of the target on that map when known (auto-walk hint) */
  x?: number;
}
export interface QuestView {
  id: string;
  title: string;
  /** LOCKED: level too low; AVAILABLE: talk to the giver; ACTIVE; READY: back to turnIn */
  status: "LOCKED" | "AVAILABLE" | "ACTIVE" | "READY";
  levelMin: number;
  giver: { id: string; name: string };
  turnIn: { id: string; name: string };
  objectives: QuestObjectiveView[];
  rewards: { exp: number; soft: number; items: ItemSummary[]; skill?: string; note?: string };
  text: { accept: string; progress: string };
  /** quest herb spots on a map, while the quest still needs them */
  nodes?: { mapId: string; points: { id: string; x: number; y: number }[] };
}
export interface SQuestUpdate {
  main: QuestView | null;
  /** main quests completed and in the chapter */
  done: number;
  total: number;
  /** every main quest written so far is completed (no current quest) */
  chapterDone: boolean;
  /** chapter of the current (or last completed) main quest and its title (step B5.1) */
  chapter?: number;
  chapterName?: string;
  /** when no quest is left: what the player waits for ("Vòng 2 mở ở bản cập nhật sau") */
  wait?: string;
  /** objective progress text to float over the player ("Hạ Nấm Lùn 3/5") */
  progress?: string;
  /** "accepted" | "ready" | "completed": banner on the client */
  event?: { kind: "accepted" | "ready" | "completed"; title: string; rewards?: QuestView["rewards"] };
}
export interface NpcOption {
  id: string;
  label: string;
  mark?: "!" | "?";
  style?: "ok" | "dim";
}
export interface ShopInfo {
  id: string;
  name: string;
  items: { item: string; name: string; icon?: string; price: number; healHp?: number; healMp?: number }[];
}
export interface ClassInfo {
  id: ClassId;
  name: string;
  role: string;
  weapon: string;
  mods: string;
  passive: string;
  passiveText: string;
  skills: { id: string; name: string; lv: number; mp: number; cd: number; text: string }[];
}
export interface RiteInfo {
  classes: ClassInfo[];
  locked: { id: string; name: string }[];
  current: ClassId | null;
  /** hours left of the free change, when a class is already chosen */
  freeHoursLeft?: number;
}
export interface SNpcDialog {
  npcId: string;
  name: string;
  face: number;
  text: string;
  options: NpcOption[];
  shop?: ShopInfo;
  rite?: RiteInfo;
}
export interface SceneLine {
  who: string;
  name: string;
  /** NPC portrait row; absent for the player */
  face?: number;
  text: string;
}
export interface SScene {
  key: string;
  lines: SceneLine[];
  /** the client answers C_NPC_CHOICE SCENE_DONE when the last line is read (the scene is a quest objective) */
  report?: boolean;
  /** the "Hết Chương 1" card shown after the lines */
  chapterEnd?: { letter: string; minutes: number; lv: number; power: number; className: string };
}
export interface SSkillsUpdate {
  skills: SkillInfo[];
  cls: ClassId | null;
}
export interface Telegraph {
  shape: "circle" | "rect";
  x: number;
  y: number;
  r?: number;
  w?: number;
  h?: number;
  /** ms until it lands */
  ms: number;
}
export interface SBossState {
  id: number;
  name: string;
  lv: number;
  /** 0-1 of the boss HP (Trang Lạc after the split: of the pages left) */
  hpPct: number;
  phase: number;
  enraged: boolean;
  /** pages still standing (Trang Lạc) */
  pieces?: number;
  telegraphs?: Telegraph[];
  /** the boss is gone (killed or left) */
  over?: boolean;
}
export interface SBossAnnounce {
  kind: "SOON" | "SPAWN" | "KILLED" | "GONE" | "ENRAGE";
  bossId: string;
  name: string;
  mapId: string;
  mapName: string;
  zoneNo?: number;
  killer?: string;
  text: string;
}
export interface SInstanceState {
  mapId: string;
  kind: "DUNGEON" | "CEREMONY";
  /** ms left on the dungeon clock */
  leftMs?: number;
  bossDown?: boolean;
  chest?: { x: number; y: number; opened: boolean };
  altar?: { x: number; y: number };
}

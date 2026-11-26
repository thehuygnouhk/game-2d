import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";
import type { z } from "zod";
import {
  Boss,
  BossEvent,
  Dungeon,
  NpcFile,
  Quest,
  QuestItems,
  SceneFile,
  Shop,
  type Boss as BossT,
  type BossEvent as BossEventT,
  type Dungeon as DungeonT,
  type Npc as NpcT,
  type Quest as QuestT,
  type QuestItems as QuestItemsT,
  type Scene as SceneT,
  type Shop as ShopT,
  type SkillSet as SkillSetT,
  DropTable,
  Item,
  MapMeta,
  Monster,
  Origins,
  type Skill,
  SkillSet,
  type DropTable as DropTableT,
  type Item as ItemT,
  type MapMeta as MapMetaT,
  type Monster as MonsterT,
  type Origins as OriginsT,
} from "../schema";

export * from "../schema";

const here = path.dirname(fileURLToPath(import.meta.url));
/** packages/content: YAML records (content-pipeline §2). */
export const CONTENT_DIR = path.resolve(here, "..");
/**
 * Map files (.tmj + .yaml) are still produced by the art pipeline (tools/art-proto) into art/prototype/maps.
 * They move into packages/content/maps together with that pipeline.
 */
export const MAP_DIR = path.resolve(here, "../../../art/prototype/maps");

export interface Portal {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  to: string;
  toX: number;
  toY: number;
}
export interface MobSpawn {
  mob: string;
  x: number;
  y: number;
  count: number;
  radius: number;
  respawnSec: number;
  level?: [number, number];
}
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
export interface MapNpc {
  id: string;
  x: number;
  y: number;
  /** the NPC stands here only once this main quest is completed (step B5.1: the friends move to Thượng Đô) */
  showAfter?: string;
  /** …or only until this main quest is completed */
  hideAfter?: string;
}
export interface BossSpawn {
  boss: string;
  x: number;
  y: number;
  /** schedule (events/) or dungeon id; empty for a field boss */
  event: string;
  /** field boss (step B5.1): stands in every zone and comes back this many minutes after it falls */
  respawnMin?: number;
}
export interface GameMap extends MapMetaT {
  /** raw Tiled JSON: the client draws it, the server reads its collision layer */
  tiled: unknown;
  spawn: { x: number; y: number };
  portals: Portal[];
  mobSpawns: MobSpawn[];
  npcs: MapNpc[];
  safeZones: Rect[];
  /** where scheduled, dungeon and field bosses appear (content-pipeline §5.2) */
  bossSpawns: BossSpawn[];
  /** revive town for a map outside its region's town (combat §7), e.g. the R03 fields → M005 */
  town?: string;
}
export interface Content {
  monsters: Map<string, MonsterT>;
  items: Map<string, ItemT>;
  origins: OriginsT;
  /** every skill by id, with the skill set (class) it belongs to */
  skills: Map<string, Skill & { set: string }>;
  drops: Map<string, DropTableT>;
  maps: Map<string, GameMap>;
  i18n: Map<string, string>;
  /** display text for an i18n key (falls back to the key); {name} placeholders filled from `vars` */
  text(key: string, vars?: Record<string, string | number>): string;
  /** step B4 */
  quests: Map<string, QuestT>;
  /** the main quest chain in order (Q_MAIN_01, 02, …) */
  mainQuests: QuestT[];
  questItems: QuestItemsT;
  npcs: Map<string, NpcT>;
  /** shops by NPC id */
  shops: Map<string, ShopT>;
  bosses: Map<string, BossT>;
  events: BossEventT[];
  dungeons: Map<string, DungeonT>;
  scenes: Map<string, SceneT>;
  /** classes chosen at the ceremony (FIRE, WATER), with their skills */
  classes: Map<string, SkillSetT>;
}

export class ContentError extends Error {
  constructor(readonly problems: string[]) {
    super(`content is invalid:\n  ${problems.join("\n  ")}`);
  }
}

/** Folders holding YAML records. Bosses and events are checked by schema from the step that uses them. */
export const RECORD_FOLDERS = [
  "monsters",
  "bosses",
  "events",
  "items",
  "classes",
  "quests",
  "shops",
  "drops",
  "npcs",
  "scenes",
  "dungeons",
];

const yamlFiles = (dir: string): string[] => {
  let out: string[] = [];
  for (const f of readdirSync(dir).sort()) {
    const p = path.join(dir, f);
    if (statSync(p).isDirectory()) out = out.concat(yamlFiles(p));
    else if (f.endsWith(".yaml")) out.push(p);
  }
  return out;
};

/** Flatten nested i18n YAML into dotted keys: { item: { "potion_hp.name": "…" } } → "item.potion_hp.name". */
export function flattenI18n(node: unknown, prefix = "", out = new Map<string, string>()): Map<string, string> {
  if (typeof node === "string") out.set(prefix, node);
  else if (Array.isArray(node)) node.forEach((v, i) => flattenI18n(v, `${prefix}.${i}`, out));
  else if (node && typeof node === "object")
    for (const [k, v] of Object.entries(node)) flattenI18n(v, prefix ? `${prefix}.${k}` : k, out);
  return out;
}

type TiledObject = {
  type: string;
  name?: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  properties?: { name: string; value: unknown }[];
};
type TiledJson = { layers: { objects?: TiledObject[] }[] };
const prop = <T>(o: TiledObject, name: string): T | undefined =>
  o.properties?.find((p) => p.name === name)?.value as T | undefined;

function mapObjects(tiled: TiledJson) {
  const objs = tiled.layers.flatMap((l) => l.objects ?? []);
  const sp = objs.find((o) => o.type === "spawn_player");
  return {
    spawn: sp ? { x: Math.round(sp.x), y: Math.round(sp.y) } : { x: 0, y: 0 },
    portals: objs
      .filter((o) => o.type === "portal")
      .map((o) => ({
        id: prop<string>(o, "id") ?? o.name ?? "",
        x: o.x,
        y: o.y,
        w: o.width ?? 64,
        h: o.height ?? 96,
        to: prop<string>(o, "to") ?? "",
        toX: prop<number>(o, "toX") ?? 0,
        toY: prop<number>(o, "toY") ?? 0,
      })),
    mobSpawns: objs
      .filter((o) => o.type === "mob_spawn")
      .map((o) => {
        const lo = prop<number>(o, "levelMin"),
          hi = prop<number>(o, "levelMax");
        return {
          mob: prop<string>(o, "mob") ?? o.name ?? "",
          x: o.x,
          y: o.y,
          count: prop<number>(o, "count") ?? 1,
          radius: prop<number>(o, "radius") ?? 64,
          respawnSec: prop<number>(o, "respawnSec") ?? 10,
          ...(lo !== undefined && hi !== undefined ? { level: [lo, hi] as [number, number] } : {}),
        };
      }),
    npcs: objs
      .filter((o) => o.type === "npc")
      .map((o) => {
        const show = prop<string>(o, "showAfter"),
          hide = prop<string>(o, "hideAfter");
        return {
          id: prop<string>(o, "id") ?? o.name ?? "",
          x: o.x,
          y: o.y,
          ...(show ? { showAfter: show } : {}),
          ...(hide ? { hideAfter: hide } : {}),
        };
      }),
    bossSpawns: objs
      .filter((o) => o.type === "boss_spawn")
      .map((o) => {
        const respawn = prop<number>(o, "respawnMin");
        return {
          boss: prop<string>(o, "boss") ?? "",
          x: o.x,
          y: o.y,
          event: prop<string>(o, "event") ?? "",
          ...(respawn ? { respawnMin: respawn } : {}),
        };
      }),
    safeZones: objs
      .filter((o) => o.type === "zone_safe")
      .map((o) => ({ x: o.x, y: o.y, w: o.width ?? 0, h: o.height ?? 0 })),
  };
}

/**
 * Load and check every record (V001 schema, V002 unique ids, V003 references, V004 i18n keys).
 * Throws ContentError listing every problem; `warnings` collects the non-blocking ones.
 */
export function loadContent(opts: { dir?: string; mapDir?: string; warnings?: string[] } = {}): Content {
  const dir = opts.dir ?? CONTENT_DIR,
    mapDir = opts.mapDir ?? MAP_DIR;
  const problems: string[] = [],
    warnings = opts.warnings ?? [];
  const rel = (p: string) => path.relative(dir, p);
  const read = (p: string): unknown => {
    try {
      return parse(readFileSync(p, "utf8"));
    } catch (e) {
      problems.push(`${rel(p)}: YAML: ${(e as Error).message.split("\n")[0]}`);
      return null;
    }
  };
  const check = <S extends z.ZodTypeAny>(schema: S, data: unknown, file: string): z.infer<S> | null => {
    const r = schema.safeParse(data);
    if (r.success) return r.data;
    for (const i of r.error.issues) problems.push(`V001 ${file}: ${i.path.join(".") || "(root)"}: ${i.message}`);
    return null;
  };
  const byId = <T extends { id: string }>(kind: string, sub: string, schema: z.ZodType<T, z.ZodTypeDef, unknown>) => {
    const out = new Map<string, T>();
    const folder = path.join(dir, sub);
    for (const f of yamlFiles(folder)) {
      const rec = check(schema, read(f), rel(f));
      if (!rec) continue;
      if (out.has(rec.id)) problems.push(`V002 ${rel(f)}: duplicate ${kind} id ${rec.id}`);
      out.set(rec.id, rec);
    }
    return out;
  };

  const monsters = byId("monster", "monsters", Monster);
  const items = byId("item", "items", Item);
  const drops = byId("drop table", "drops", DropTable);
  const origins = check(Origins, read(path.join(dir, "classes", "origins.yaml")), "classes/origins.yaml");
  const skills = new Map<string, Skill & { set: string }>();
  const classes = new Map<string, SkillSetT>();
  for (const f of yamlFiles(path.join(dir, "classes")).filter((f) => !f.endsWith("origins.yaml"))) {
    const set = check(SkillSet, read(f), rel(f));
    if (set && set.id !== "NOVICE") classes.set(set.id, set);
    for (const s of set?.skills ?? []) {
      if (skills.has(s.id)) problems.push(`V002 ${rel(f)}: duplicate skill id ${s.id}`);
      skills.set(s.id, { ...s, set: set!.id });
    }
  }
  const i18n = flattenI18n(read(path.join(dir, "i18n", "vi.yaml")));

  const quests = new Map<string, QuestT>();
  for (const f of yamlFiles(path.join(dir, "quests")).filter((f) => !f.endsWith("quest_items.yaml"))) {
    const q = check(Quest, read(f), rel(f));
    if (!q) continue;
    if (quests.has(q.id)) problems.push(`V002 ${rel(f)}: duplicate quest id ${q.id}`);
    quests.set(q.id, q);
  }
  const mainQuests = [...quests.values()].filter((q) => q.type === "MAIN").sort((a, b) => a.id.localeCompare(b.id));
  const questItems =
    check(QuestItems, read(path.join(dir, "quests", "quest_items.yaml")), "quests/quest_items.yaml") ?? {};
  const npcs = new Map<string, NpcT>();
  for (const f of yamlFiles(path.join(dir, "npcs")))
    for (const n of check(NpcFile, read(f), rel(f))?.npcs ?? []) {
      if (npcs.has(n.id)) problems.push(`V002 ${rel(f)}: duplicate npc id ${n.id}`);
      npcs.set(n.id, n);
    }
  const shops = new Map<string, ShopT>();
  for (const f of yamlFiles(path.join(dir, "shops"))) {
    const sh = check(Shop, read(f), rel(f));
    if (sh) shops.set(sh.npc, sh);
  }
  const bosses = byId("boss", "bosses", Boss);
  const events = [...byId("event", "events", BossEvent).values()];
  const dungeons = byId("dungeon", "dungeons", Dungeon);
  const scenes = new Map<string, SceneT>();
  for (const f of yamlFiles(path.join(dir, "scenes")))
    for (const sc of check(SceneFile, read(f), rel(f))?.scenes ?? []) scenes.set(sc.id, sc);

  const maps = new Map<string, GameMap>();
  for (const f of readdirSync(mapDir)
    .filter((f) => f.endsWith(".yaml"))
    .sort()) {
    const meta = check(MapMeta, read(path.join(mapDir, f)), `maps/${f}`);
    if (!meta) continue;
    let tiled: TiledJson;
    try {
      tiled = JSON.parse(readFileSync(path.join(mapDir, meta.tmj), "utf8")) as TiledJson;
    } catch (e) {
      problems.push(`V003 maps/${f}: cannot read ${meta.tmj}: ${(e as Error).message}`);
      continue;
    }
    if (maps.has(meta.id)) problems.push(`V002 maps/${f}: duplicate map id ${meta.id}`);
    maps.set(meta.id, { ...meta, tiled, ...mapObjects(tiled) });
  }

  // V003: references between records
  for (const m of monsters.values())
    if (!drops.has(m.drops)) problems.push(`V003 monster ${m.id}: drop table ${m.drops} does not exist`);
  for (const d of drops.values()) {
    const ids = [
      ...d.entries.flatMap((e) => (e.item ? [e.item] : Object.keys(e.pick ?? {}))),
      ...d.gear.items,
      ...[d.tiers.elite.guaranteed, d.tiers.leader.guaranteed].filter((x): x is string => !!x),
    ];
    for (const id of ids) if (!items.has(id)) problems.push(`V003 drop table ${d.id}: item ${id} does not exist`);
  }
  for (const m of maps.values()) {
    for (const s of m.mobSpawns)
      if (!monsters.has(s.mob)) problems.push(`V003 map ${m.id}: spawn of unknown monster ${s.mob}`);
    for (const p of m.portals)
      if (!maps.has(p.to)) warnings.push(`V003 map ${m.id}: portal ${p.id} leads to ${p.to}, which is not built yet`);
  }
  const ref = (ok: boolean, msg: string) => ok || problems.push(`V003 ${msg}`);
  for (const q of quests.values()) {
    ref(npcs.has(q.giver), `quest ${q.id}: giver ${q.giver} is not an NPC`);
    ref(npcs.has(q.turnIn), `quest ${q.id}: turnIn ${q.turnIn} is not an NPC`);
    for (const p of q.prerequisites) ref(quests.has(p), `quest ${q.id}: prerequisite ${p} does not exist`);
    for (const it of q.rewards.items) ref(items.has(it.id), `quest ${q.id}: reward item ${it.id} does not exist`);
    for (const o of q.objectives) {
      const known =
        o.type === "KILL"
          ? monsters.has(o.target)
          : o.type === "BOSS"
            ? bosses.has(o.target)
            : o.type === "TALK"
              ? npcs.has(o.target)
              : o.type === "COLLECT"
                ? o.target in questItems
                : o.type === "USE_SKILL"
                  ? skills.has(o.target)
                  : o.type === "SCENE"
                    ? scenes.has(o.target)
                    : maps.has(o.target);
      ref(known, `quest ${q.id}: ${o.type} target ${o.target} does not exist`);
      ref(maps.has(o.map), `quest ${q.id}: map ${o.map} does not exist`);
    }
  }
  for (const [id, src] of Object.entries(questItems))
    ref("mob" in src ? monsters.has(src.mob) : maps.has(src.node), `quest item ${id}: unknown source`);
  for (const sh of shops.values()) {
    ref(npcs.has(sh.npc), `shop of ${sh.npc}: not an NPC`);
    for (const id of sh.sells) ref(!!items.get(id)?.value, `shop of ${sh.npc}: ${id} is not an item with a value`);
  }
  for (const b of bosses.values()) if (b.drops) ref(drops.has(b.drops), `boss ${b.id}: drop table ${b.drops}`);
  for (const b of bosses.values())
    for (const ph of b.phases)
      ref(ph.mob ? monsters.has(ph.mob) : bosses.has(ph.into ?? ""), `boss ${b.id}: phase ${ph.action} target`);
  for (const e of events) {
    ref(bosses.has(e.boss), `event ${e.id}: boss ${e.boss}`);
    for (const m of e.maps) ref(maps.has(m), `event ${e.id}: map ${m}`);
  }
  for (const d of dungeons.values()) {
    ref(maps.has(d.id) && bosses.has(d.boss) && maps.has(d.entry.map), `dungeon ${d.id}: map, boss or entry`);
    for (const id of [...d.chest.items.map((i) => i.id), ...d.chest.gear.items])
      ref(items.has(id), `dungeon ${d.id}: chest item ${id}`);
  }
  for (const c of classes.values()) if (c.weapon) ref(items.has(c.weapon), `class ${c.id}: weapon ${c.weapon}`);
  for (const sc of scenes.values())
    for (const l of sc.lines) ref(l.who === "PLAYER" || npcs.has(l.who), `scene ${sc.id}: speaker ${l.who}`);
  for (const m of maps.values()) {
    for (const n of m.npcs) {
      ref(npcs.has(n.id), `map ${m.id}: unknown NPC ${n.id}`);
      for (const qid of [n.showAfter, n.hideAfter].filter((x): x is string => !!x))
        ref(quests.has(qid), `map ${m.id}: NPC ${n.id} waits for unknown quest ${qid}`);
    }
    for (const b of m.bossSpawns)
      if (b.respawnMin) ref(bosses.has(b.boss), `map ${m.id}: field boss ${b.boss} does not exist`);
    if (m.town) ref(maps.get(m.town)?.type === "TOWN", `map ${m.id}: revive town ${m.town} is not a town`);
  }

  // V004: every *Key has a vi text
  const keyRefs = (node: unknown, where: string): void => {
    if (Array.isArray(node)) node.forEach((v) => keyRefs(v, where));
    else if (node && typeof node === "object")
      for (const [k, v] of Object.entries(node)) {
        if (k.endsWith("Key") && typeof v === "string" && !i18n.has(v))
          problems.push(`V004 ${where}: ${k} "${v}" has no text in i18n/vi.yaml`);
        else keyRefs(v, where);
      }
  };
  for (const sub of RECORD_FOLDERS) for (const f of yamlFiles(path.join(dir, sub))) keyRefs(read(f), rel(f));
  for (const m of maps.values()) keyRefs({ nameKey: m.nameKey }, `maps/${m.id.toLowerCase()}.yaml`);

  if (problems.length || !origins) throw new ContentError(problems.length ? problems : ["classes/origins.yaml"]);
  return {
    monsters,
    items,
    origins,
    skills,
    drops,
    maps,
    i18n,
    text: (key, vars) => {
      const t = i18n.get(key) ?? key;
      return vars ? t.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m)) : t;
    },
    quests,
    mainQuests,
    questItems,
    npcs,
    shops,
    bosses,
    events,
    dungeons,
    scenes,
    classes,
  };
}

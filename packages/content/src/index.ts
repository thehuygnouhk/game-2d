import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";
import type { z } from "zod";
import {
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
export interface GameMap extends MapMetaT {
  /** raw Tiled JSON: the client draws it, the server reads its collision layer */
  tiled: unknown;
  spawn: { x: number; y: number };
  portals: Portal[];
  mobSpawns: MobSpawn[];
  npcs: { id: string; x: number; y: number }[];
  safeZones: Rect[];
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
  /** display text for an i18n key (falls back to the key) */
  text(key: string): string;
}

export class ContentError extends Error {
  constructor(readonly problems: string[]) {
    super(`content is invalid:\n  ${problems.join("\n  ")}`);
  }
}

/** Folders holding YAML records. Bosses and events are checked by schema from the step that uses them. */
export const RECORD_FOLDERS = ["monsters", "bosses", "events", "items", "classes", "quests", "shops", "drops"];

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
      .map((o) => ({ id: prop<string>(o, "id") ?? o.name ?? "", x: o.x, y: o.y })),
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
  for (const f of yamlFiles(path.join(dir, "classes")).filter((f) => !f.endsWith("origins.yaml"))) {
    const set = check(SkillSet, read(f), rel(f));
    for (const s of set?.skills ?? []) {
      if (skills.has(s.id)) problems.push(`V002 ${rel(f)}: duplicate skill id ${s.id}`);
      skills.set(s.id, { ...s, set: set!.id });
    }
  }
  const i18n = flattenI18n(read(path.join(dir, "i18n", "vi.yaml")));

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
    text: (key) => i18n.get(key) ?? key,
  };
}

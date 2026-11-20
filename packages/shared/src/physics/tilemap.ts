/** Collision grid read from the Tiled "collision" layer (docs/workflows/content-pipeline.md, maps §1.1). */
export const TILE = 32;
export const Tile = { EMPTY: 0, SOLID: 1, ONE_WAY: 2, LADDER: 3, HAZARD: 4 } as const;

export interface CollisionMap {
  width: number; // tiles
  height: number; // tiles
  tiles: Uint8Array; // row-major Tile values
}

interface TiledLayer {
  name: string;
  type: string;
  data?: number[];
  width?: number;
  height?: number;
  objects?: {
    type: string;
    x: number;
    y: number;
    width?: number;
    height?: number;
    properties?: { name: string; value: unknown }[];
  }[];
}
export interface TiledMap {
  width: number;
  height: number;
  tilewidth: number;
  layers: TiledLayer[];
  tilesets: { name?: string; firstgid: number }[];
}

export function collisionFromTiled(map: TiledMap): CollisionMap {
  if (map.tilewidth !== TILE) throw new Error(`tile size ${map.tilewidth} is not ${TILE}`);
  const layer = map.layers.find((l) => l.name === "collision" && l.type === "tilelayer");
  if (!layer?.data) throw new Error("map has no collision layer");
  const first = map.tilesets.find((t) => t.name === "collision")?.firstgid ?? 1;
  const tiles = new Uint8Array(map.width * map.height);
  layer.data.forEach((gid, i) => {
    tiles[i] = gid >= first && gid < first + 4 ? gid - first + 1 : 0;
  });
  return { width: map.width, height: map.height, tiles };
}

export function spawnPoint(map: TiledMap): { x: number; y: number } {
  for (const l of map.layers)
    for (const o of l.objects ?? []) if (o.type === "spawn_player") return { x: Math.round(o.x), y: Math.round(o.y) };
  return { x: map.width * TILE * 0.5, y: 0 };
}

export function tileAt(m: CollisionMap, col: number, row: number): number {
  if (col < 0 || col >= m.width) return Tile.SOLID; // side walls
  if (row < 0 || row >= m.height) return Tile.EMPTY;
  return m.tiles[row * m.width + col] ?? Tile.EMPTY;
}

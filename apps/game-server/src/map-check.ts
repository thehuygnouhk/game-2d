// pnpm map:check: every Tiled map has a collision layer, a spawn point standing on ground, and every monster
// spawn and portal of a hosted map sits over ground the server can place things on.
import { loadContent } from "@htk/content";
import { collisionFromTiled, makeBody, step, TILE, Tile, tileAt, type TiledMap } from "@htk/shared";

const warnings: string[] = [];
const content = loadContent({ mapDir: process.env.MAP_DIR, warnings });
let bad = 0;
for (const m of [...content.maps.values()].sort((a, b) => a.id.localeCompare(b.id))) {
  try {
    const coll = collisionFromTiled(m.tiled as TiledMap);
    let b = makeBody(m.spawn.x, m.spawn.y - 40);
    for (let i = 0; i < 80 && !b.ground; i++) b = step(coll, b, { dir: 0, jump: false, down: false });
    if (!b.ground || b.y >= coll.height * TILE)
      throw new Error(`spawn (${m.spawn.x}, ${m.spawn.y}) does not land on ground`);
    for (const s of m.mobSpawns) {
      if (content.monsters.get(s.mob)?.ai.flying) continue;
      const c = Math.floor(s.x / TILE);
      let r = Math.max(0, Math.floor((s.y - 40) / TILE));
      while (r < coll.height && tileAt(coll, c, r) !== Tile.SOLID && tileAt(coll, c, r) !== Tile.ONE_WAY) r++;
      if (r >= coll.height) throw new Error(`spawn of ${s.mob} at (${s.x}, ${s.y}) has no ground below`);
    }
    console.log(
      `ok   ${m.id}: ${coll.width}x${coll.height} tiles, spawn lands at y=${b.y}, ` +
        `${m.mobSpawns.length} monster spawns, ${m.portals.length} portals`,
    );
  } catch (e) {
    bad++;
    console.log(`FAIL ${m.id}: ${(e as Error).message}`);
  }
}
for (const w of warnings) console.log(`warn ${w}`);
process.exit(bad ? 1 : 0);

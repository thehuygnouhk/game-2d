// pnpm map:check: every Tiled map the server can host has a collision layer and a spawn point standing on ground.
import { readdirSync } from "node:fs";
import { collisionFromTiled, makeBody, spawnPoint, step } from "@htk/shared";
import { DEFAULT_MAP_DIR } from "./config";
import { loadMap } from "./server";

const dir = process.env.MAP_DIR ?? DEFAULT_MAP_DIR;
let bad = 0;
for (const file of readdirSync(dir)
  .filter((f) => f.endsWith(".tmj"))
  .sort()) {
  const id = file.replace(".tmj", "").toUpperCase();
  try {
    const t = loadMap(dir, id);
    const coll = collisionFromTiled(t);
    const sp = spawnPoint(t);
    let b = makeBody(sp.x, sp.y - 40);
    for (let i = 0; i < 80 && !b.ground; i++) b = step(coll, b, { dir: 0, jump: false, down: false });
    if (!b.ground || b.y >= coll.height * 32) throw new Error(`spawn (${sp.x}, ${sp.y}) does not land on ground`);
    console.log(`ok   ${id}: ${coll.width}x${coll.height} tiles, spawn lands at y=${b.y}`);
  } catch (e) {
    bad++;
    console.log(`FAIL ${id}: ${(e as Error).message}`);
  }
}
process.exit(bad ? 1 : 0);

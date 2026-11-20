import { describe, expect, it } from "vitest";
import { type Body, type CollisionMap, makeBody, type MoveInput, PHYS, step, Tile, TILE } from "../src";

// 20 x 12 test room: floor on row 10, a solid wall at column 15 (rows 6-9), a one-way ledge on row 7 at columns 4-7
function room(): CollisionMap {
  const w = 20,
    h = 12,
    tiles = new Uint8Array(w * h);
  for (let c = 0; c < w; c++) tiles[10 * w + c] = Tile.SOLID;
  for (let r = 6; r <= 9; r++) tiles[r * w + 15] = Tile.SOLID;
  for (let c = 4; c <= 7; c++) tiles[7 * w + c] = Tile.ONE_WAY;
  return { width: w, height: h, tiles };
}
const idle: MoveInput = { dir: 0, jump: false, down: false };
const run = (m: CollisionMap, b: Body, n: number, inp: MoveInput = idle) => {
  for (let i = 0; i < n; i++) b = step(m, b, inp);
  return b;
};

describe("shared movement (server-design §4)", () => {
  it("falls onto the floor and stays there", () => {
    const b = run(room(), makeBody(100, 40), 40);
    expect(b).toMatchObject({ y: 10 * TILE, vy: 0, ground: true });
  });
  it("walks 9 px per tick (180 px/s)", () => {
    const m = room();
    const b0 = run(m, makeBody(100, 320), 2);
    const b1 = step(m, b0, { dir: 1, jump: false, down: false });
    expect(b1.x - b0.x).toBe(9);
    expect(b1.facing).toBe(1);
  });
  it("jumps a little over 3 tiles (maps V016)", () => {
    const m = room();
    let b = run(m, makeBody(300, 320), 2);
    let top = b.y;
    b = step(m, b, { dir: 0, jump: true, down: false });
    for (let i = 0; i < 30; i++) {
      b = step(m, b, idle);
      top = Math.min(top, b.y);
    }
    const height = 320 - top;
    expect(height).toBeGreaterThan(3 * TILE);
    expect(height).toBeLessThan(4 * TILE);
    expect(b.ground).toBe(true);
  });
  it("stops at a solid wall", () => {
    const m = room();
    const b = run(m, run(m, makeBody(400, 320), 2), 40, { dir: 1, jump: false, down: false });
    expect(b.x).toBe(15 * TILE - PHYS.W / 2);
  });
  it("passes one-way tiles from below, lands on them from above, drops with down", () => {
    const m = room();
    let b = run(m, makeBody(5.5 * TILE, 320), 2);
    b = step(m, b, { dir: 0, jump: true, down: false });
    b = run(m, b, 30);
    expect(b.y).toBe(7 * TILE); // jumped through from below, landed on the ledge
    b = step(m, b, { dir: 0, jump: false, down: true });
    b = run(m, b, 20);
    expect(b.y).toBe(10 * TILE); // dropped back to the floor
  });
  it("is deterministic and integer-valued", () => {
    const m = room();
    const seq = Array.from({ length: 200 }, (_, i) => ({
      dir: (((i * 7) % 3) - 1) as -1 | 0 | 1,
      jump: i % 11 === 0,
      down: i % 17 === 0,
    }));
    const a = seq.reduce((b, inp) => step(m, b, inp), makeBody(200, 0));
    const c = seq.reduce((b, inp) => step(m, b, inp), makeBody(200, 0));
    expect(a).toEqual(c);
    expect(Number.isInteger(a.x) && Number.isInteger(a.y) && a.vy % 8 === 0).toBe(true);
  });
});

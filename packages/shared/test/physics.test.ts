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

// Ladder room: floor on row 10. Ladder A (col 5, rows 5-9) leads up into a one-way platform on row 4 (cols 3-7).
// Ladder B (col 12, rows 6-9) ends in open air beside a solid ledge (cols 13-15, rows 6-9). Hazard tiles at
// cols 17-18 row 9, on the floor.
function ladders(): CollisionMap {
  const w = 20,
    h = 12,
    tiles = new Uint8Array(w * h);
  const set = (c: number, r: number, t: number) => (tiles[r * w + c] = t);
  for (let c = 0; c < w; c++) set(c, 10, Tile.SOLID);
  for (let r = 5; r <= 9; r++) set(5, r, Tile.LADDER);
  for (let c = 3; c <= 7; c++) set(c, 4, Tile.ONE_WAY);
  for (let r = 6; r <= 9; r++) {
    set(12, r, Tile.LADDER);
    for (let c = 13; c <= 15; c++) set(c, r, Tile.SOLID);
  }
  set(17, 9, Tile.HAZARD);
  set(18, 9, Tile.HAZARD);
  return { width: w, height: h, tiles };
}
const up: MoveInput = { dir: 0, jump: false, down: false, up: true };
const down: MoveInput = { dir: 0, jump: false, down: true };
const q8 = (v: number) => Math.round(v / 8) * 8; // vy is kept to multiples of 8

describe("ladders and hazards (server-design §4.1)", () => {
  it("climbs a ladder at 120 px/s and steps onto the platform above", () => {
    const m = ladders();
    let b = run(m, makeBody(5 * TILE + 10, 320), 2);
    b = step(m, b, up);
    expect(b).toMatchObject({ climb: true, x: 5 * TILE + 16, y: 320 - PHYS.CLIMB_Y }); // centred on the ladder
    for (let i = 0; i < 60 && b.climb; i++) b = step(m, b, up);
    expect(b).toMatchObject({ y: 4 * TILE, ground: true, climb: false });
    b = run(m, b, 10);
    expect(b.y).toBe(4 * TILE); // stands on the one-way platform
  });
  it("climbs down from the platform to the floor", () => {
    const m = ladders();
    let b = run(m, makeBody(5 * TILE + 16, 4 * TILE), 2);
    expect(b.ground).toBe(true);
    b = step(m, b, down);
    expect(b.climb).toBe(true);
    b = run(m, b, 40, down);
    expect(b).toMatchObject({ y: 10 * TILE, ground: true, climb: false });
  });
  it("stands on a ladder top in open air and walks onto the ledge beside it", () => {
    const m = ladders();
    let b = step(m, run(m, makeBody(12 * TILE + 16, 320), 2), up);
    for (let i = 0; i < 60 && b.climb; i++) b = step(m, b, up);
    expect(b).toMatchObject({ y: 6 * TILE, ground: true });
    b = run(m, b, 6, { dir: 1, jump: false, down: false });
    expect(b.x).toBeGreaterThan(13 * TILE + 12);
    expect(b).toMatchObject({ y: 6 * TILE, ground: true });
  });
  it("lets go of a ladder with jump, and up away from a ladder is a jump", () => {
    const m = ladders();
    let b = run(m, makeBody(5 * TILE + 16, 320), 2);
    b = run(m, b, 10, up);
    expect(b.climb).toBe(true);
    b = step(m, b, { dir: 0, jump: true, down: false });
    expect(b.climb).toBe(false);
    b = run(m, b, 30);
    expect(b).toMatchObject({ y: 10 * TILE, ground: true });
    const away = step(m, run(m, makeBody(9 * TILE, 320), 2), up);
    expect(away.vy).toBe(q8(-PHYS.JUMP + PHYS.GRAVITY * PHYS.DT));
  });
  it("throws the body up from a hazard tile, unless it jumps", () => {
    const m = ladders();
    const b: Body = { ...makeBody(17 * TILE + 20, 10 * TILE), ground: true };
    const hurt = step(m, b, idle);
    expect(hurt.hazard).toBe(true);
    expect(hurt.vy).toBe(q8(-PHYS.BOUNCE + PHYS.GRAVITY * PHYS.DT));
    const jumped = step(m, b, { dir: 0, jump: true, down: false });
    expect(jumped.hazard).toBeUndefined();
    expect(jumped.vy).toBe(q8(-PHYS.JUMP + PHYS.GRAVITY * PHYS.DT));
  });
});

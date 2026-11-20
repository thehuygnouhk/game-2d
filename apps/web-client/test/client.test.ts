import { describe, expect, it } from "vitest";
import { type CollisionMap, makeBody, step, Tile } from "@htk/shared";
import { Predictor } from "../src/world/prediction";
import { RemoteTrack } from "../src/world/remote";

function flat(): CollisionMap {
  const w = 40,
    h = 12,
    tiles = new Uint8Array(w * h);
  for (let c = 0; c < w; c++) tiles[10 * w + c] = Tile.SOLID;
  return { width: w, height: h, tiles };
}
const R = { dir: 1 as const, jump: false, down: false };

describe("prediction (client-design §5.1)", () => {
  it("replays unacknowledged inputs on top of the server state with no error", () => {
    const m = flat();
    let server = makeBody(100, 320);
    for (let i = 0; i < 3; i++) server = step(m, server, { dir: 0, jump: false, down: false });
    const p = new Predictor(m, server);
    for (let s = 1; s <= 10; s++) p.apply(s, s === 3 ? { ...R, jump: true } : R);
    // the server has processed inputs 1..6 so far
    let auth = server;
    for (let s = 1; s <= 6; s++) auth = step(m, auth, s === 3 ? { ...R, jump: true } : R);
    expect(p.reconcile(6, auth)).toBe(0);
    expect(p.unacked).toBe(4);
  });
  it("snaps to the server when the prediction was wrong", () => {
    const m = flat();
    const start = { ...makeBody(100, 320), ground: true };
    const p = new Predictor(m, start);
    for (let s = 1; s <= 5; s++) p.apply(s, R);
    const err = p.reconcile(5, { ...start, x: 100 }); // server refused the movement
    expect(err).toBe(45);
    expect(p.body.x).toBe(100);
    expect(p.corrections).toBe(1);
  });
});

describe("interpolation (client-design §5.2)", () => {
  it("renders 100 ms behind, between the two surrounding samples", () => {
    const r = new RemoteTrack();
    r.push({ t: 1000, x: 0, y: 0, st: 1, f: 1 });
    r.push({ t: 1100, x: 18, y: 0, st: 1, f: 1 });
    expect(r.sample(1150)?.x).toBeCloseTo(9);
  });
  it("extrapolates at most 200 ms after the last sample", () => {
    const r = new RemoteTrack();
    r.push({ t: 1000, x: 0, y: 0, st: 1, f: 1 });
    r.push({ t: 1100, x: 18, y: 0, st: 1, f: 1 });
    expect(r.sample(2000)?.x).toBeCloseTo(18 + 0.18 * 200);
  });
});

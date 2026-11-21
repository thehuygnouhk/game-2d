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

describe("game state (client-design §3)", () => {
  const enter = {
    you: 7,
    character: { name: "Anh", appearance: { origin: "VILLAGER" as const, gender: "MALE" as const } },
    map: { id: "M002", zone: 1, name: "Đồng Hoa Suối Mơ" },
    tick: 1,
    ack: 0,
    body: { x: 0, y: 0, vy: 0, st: 0 },
    entities: [],
    drops: [],
    stats: {
      lv: 1,
      exp: 0,
      expNext: 150,
      hp: 100,
      mp: 70,
      maxHp: 340,
      maxMp: 70,
      atk: 34,
      def: 13,
      crit: 0.05,
      power: 300,
      statPoints: 0,
      pts: { hp: 4, mp: 0, atk: 4, def: 2, crit: 0 },
    },
    skills: [{ id: "SKL_BASIC", name: "Đòn Thường", unlockLevel: 1, mp: 0, cooldownMs: 1000 }],
    bag: { soft: 0, items: [], size: 30 },
  };
  it("applies bag deltas and picks the potion that fits the missing HP", async () => {
    const { GameState } = await import("../src/state");
    const s = new GameState(enter);
    let calls = 0;
    s.subscribe(() => calls++);
    const small = {
      instanceId: "b1",
      kind: "item" as const,
      item: "potion_hp",
      name: "Bình HP Nhỏ",
      qty: 3,
      healHp: 150,
    };
    const big = {
      instanceId: "b2",
      kind: "item" as const,
      item: "potion_hp_m",
      name: "Bình HP Vừa",
      qty: 1,
      healHp: 600,
    };
    s.applyInventory({ soft: 25, add: [small, big], update: [], remove: [] });
    expect(s.bag.soft).toBe(25);
    expect(s.potionCount("hp")).toBe(4);
    expect(s.potion("hp")?.instanceId).toBe("b2"); // 240 HP missing: the small one is not enough
    s.applyStats({ hp: 300 });
    expect(s.potion("hp")?.instanceId).toBe("b1");
    s.applyInventory({ soft: 25, add: [], update: [{ instanceId: "b1", qty: 2 }], remove: ["b2"] });
    expect(s.bag.items.map((i) => [i.instanceId, i.qty])).toEqual([["b1", 2]]);
    expect(s.potion("mp")).toBeUndefined();
    expect(calls).toBe(3);
  });
});

describe("prediction on ladders (server-design §4.1)", () => {
  it("stays in step with the server while climbing", () => {
    const w = 20,
      h = 12,
      tiles = new Uint8Array(w * h);
    for (let c = 0; c < w; c++) tiles[10 * w + c] = Tile.SOLID;
    for (let r = 5; r <= 9; r++) tiles[r * w + 6] = Tile.LADDER;
    for (let c = 4; c <= 8; c++) tiles[4 * w + c] = Tile.ONE_WAY;
    const m = { width: w, height: h, tiles };
    const start = { ...makeBody(6 * 32 + 16, 320), ground: true };
    const p = new Predictor(m, start);
    const up = { dir: 0 as const, jump: false, down: false, up: true };
    let auth = start;
    for (let s = 1; s <= 40; s++) {
      p.apply(s, up);
      auth = step(m, auth, up);
      if (s % 5 === 0) expect(p.reconcile(s, auth)).toBe(0);
    }
    expect(p.body.y).toBeLessThanOrEqual(4 * 32);
  });
});

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  ErrorCode,
  expToNext,
  Op,
  PROTOCOL_VERSION,
  type SDamage,
  type SEntityDied,
  type SInventoryDelta,
  type SMapChange,
  type SSnapshot,
  type SZoneList,
} from "@htk/shared";
import { gainExp } from "../src/world/combat";
import { Drop, type Player } from "../src/world/entities";
import { type GameServer, startGameServer } from "../src/server";
import { Client } from "./helpers/client";

let server: GameServer;
const logs: string[] = [];
const start = (devGuest = true) =>
  startGameServer({ port: 0, mapId: "M001", devGuest, seed: 42, realmId: 1, log: (e) => logs.push(e) });
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const playerOf = (id: number): Player => {
  for (const s of server.sessions) if (s.entity?.id === id) return s.entity;
  throw new Error(`no player ${id}`);
};
/** move a player to (x, y) of map/zone through the real map change path */
const teleport = (p: Player, map: string, zone: number, x: number, y: number) =>
  server.world.transfer(p, server.world.zone(map, zone)!, x, y);
const ROLL = () => 0.5; // every roll: hit, no crit, variance x1.0, normal tier

beforeAll(async () => {
  server = await start();
});
afterAll(async () => {
  await server.close();
});

describe("game server, step B1 (movement)", () => {
  it("two players enter M001 and see each other", async () => {
    const a = await Client.open(server.port),
      b = await Client.open(server.port);
    const wa = await a.join("Anh");
    expect(wa.map).toEqual({ id: "M001", zone: 1, name: "Nhà Học Suối Mơ" });
    expect(wa.entities).toEqual([]);
    expect(wa.body.st).toBeLessThan(2); // landed on the ground
    expect(wa.stats).toMatchObject({ lv: 1, exp: 0, expNext: 150, maxHp: 180, atk: 24, statPoints: 10 }); // combat §3.3
    expect(wa.skills.map((s) => s.name)).toEqual(["Đòn Thường", "Tụ Mana Chấn"]);
    const wb = await b.join("Bình");
    expect(wb.entities.map((e) => e.kind === "player" && e.name)).toEqual(["Anh"]);
    const spawn = await a.wait<{ name: string; appearance: unknown }>(Op.S_ENTITY_SPAWN, (p) => p.name === "Bình");
    expect(spawn.appearance).toEqual({ origin: "NOBLE", gender: "FEMALE" });
    for (let i = 0; i < 20; i++) {
      a.send(Op.C_MOVE_INPUT, { seq: i + 1, dir: 1, jump: 0, down: 0, tickClient: i });
      await sleep(50);
    }
    await a.wait<SSnapshot>(Op.S_SNAPSHOT, (p) => p.ack === 20);
    await b.wait<SSnapshot>(Op.S_SNAPSHOT, (p) => p.ents.some((e) => e.id === wa.you && e.x === wa.body.x + 180));
    a.close();
    const gone = await b.wait<{ ids: number[] }>(Op.S_ENTITY_DESPAWN);
    expect(gone.ids).toEqual([wa.you]);
    b.close();
  });

  it("does not let a client fast-forward by flooding inputs", async () => {
    const c = await Client.open(server.port);
    const w = await c.join("Cường");
    const t0 = server.world.tick;
    for (let i = 1; i <= 80; i++) c.send(Op.C_MOVE_INPUT, { seq: i, dir: 1, jump: 0, down: 0, tickClient: i });
    await sleep(600);
    const p = playerOf(w.you);
    const ticks = server.world.tick - t0;
    expect(p.body.x - w.body.x).toBeLessThanOrEqual((ticks + 3) * 9);
    expect(p.body.x - w.body.x).toBeLessThan(80 * 9);
    c.close();
  });

  it("rejects an old protocol version with E_VERSION", async () => {
    const c = await Client.open(server.port);
    c.hello("Dũng", PROTOCOL_VERSION + 5);
    const e = await c.wait<{ code: number }>(Op.S_ERROR);
    expect(e.code).toBe(ErrorCode.E_VERSION);
    await sleep(100);
    expect(c.closed).toBe(true);
  });

  it("closes a connection after three invalid packets", async () => {
    const c = await Client.open(server.port);
    for (let i = 0; i < 3; i++) c.ws.send(new Uint8Array([9, 9, 9]));
    await sleep(200);
    expect(c.frames.filter((f) => f.op === Op.S_ERROR)).toHaveLength(3);
    expect(c.closed).toBe(true);
  });

  it("refuses bad guest names and, without DEV_GUEST, every ticket", async () => {
    const c = await Client.open(server.port);
    c.send(Op.C_HELLO, { ticket: "guest:<x>", clientVersion: "t", protocolVersion: PROTOCOL_VERSION });
    expect((await c.wait<{ code: number }>(Op.S_ERROR)).code).toBe(ErrorCode.E_AUTH);
    const locked = await start(false);
    const d = await Client.open(locked.port);
    d.hello("Giang");
    expect((await d.wait<{ code: number }>(Op.S_ERROR)).code).toBe(ErrorCode.E_AUTH);
    await locked.close();
  });
});

describe("game server, step B2 (monsters, combat, zones, chat)", () => {
  it("hosts R01 with three zones per map and monsters from the content", () => {
    // R01, then Thượng Đô (R02) and Đồng Lúa (R03) from step B5.1
    expect([...server.world.zones.keys()].sort()).toEqual(["M001", "M002", "M003", "M004", "M005", "M008", "M009"]);
    const z = server.world.zone("M002", 2)!;
    const kinds = new Set([...z.mobs.values()].map((m) => m.def.id));
    expect(kinds).toEqual(new Set(["MOB001", "MOB002"]));
    expect(z.mobs.size).toBe(6 + 2 + 6 + 2 + 4);
    for (const m of z.mobs.values()) expect(m.lv).toBeGreaterThanOrEqual(m.def.level[0]);
  });

  it("lets two players fight one monster and share the kill by damage", async () => {
    server.world.rng = ROLL;
    const a = await Client.open(server.port),
      b = await Client.open(server.port);
    const wa = await a.join("Hằng"),
      wb = await b.join("Khoa");
    const pa = playerOf(wa.you),
      pb = playerOf(wb.you);
    const z = server.world.zone("M002", 3)!;
    const mob = [...z.mobs.values()].find((m) => m.def.id === "MOB001")!;
    mob.hp = mob.max.hp = 400; // tough enough to take two hits
    teleport(pa, "M002", 3, mob.x - 40, mob.y - 10);
    teleport(pb, "M002", 3, mob.x + 40, mob.y - 10);
    await a.wait<SMapChange>(Op.S_MAP_CHANGE, (p) => p.map.id === "M002" && p.map.zone === 3);
    const seen = await b.wait<SMapChange>(Op.S_MAP_CHANGE, (p) => p.map.id === "M002" && p.map.zone === 3);
    expect(seen.entities.find((e) => e.id === mob.id)).toMatchObject({ kind: "mob", name: "Nấm Lùn" });
    a.send(Op.C_USE_SKILL, { skillId: "SKL_BASIC", targetId: mob.id, seq: 0 });
    const hitA = await b.wait<SDamage>(Op.S_DAMAGE, (d) => d.targetId === mob.id && d.sourceId === pa.id);
    expect(hitA).toMatchObject({ miss: false, crit: false });
    expect(hitA.amount).toBeGreaterThan(20);
    expect(hitA.hp).toBeLessThan(255);
    mob.hp = 1; // the next hit kills
    b.send(Op.C_USE_SKILL, { skillId: "SKL_BASIC", targetId: mob.id, seq: 0 });
    const diedA = await a.wait<SEntityDied>(Op.S_ENTITY_DIED, (d) => d.id === mob.id);
    const diedB = await b.wait<SEntityDied>(Op.S_ENTITY_DIED, (d) => d.id === mob.id);
    expect(diedA.killerId).toBe(pb.id);
    // both dealt about half of the damage: each gets about half of the EXP
    expect(diedA.exp! + diedB.exp!).toBeGreaterThanOrEqual(mob.max.exp - 1);
    expect(Math.abs(diedA.exp! - diedB.exp!)).toBeLessThanOrEqual(2);
    expect(pa.exp).toBe(diedA.exp);
    expect(z.mobs.has(mob.id)).toBe(false);
    await a.wait<{ ids: number[] }>(Op.S_ENTITY_DESPAWN, (d) => d.ids.includes(mob.id));
    // a skill still on cooldown is refused
    a.send(Op.C_USE_SKILL, { skillId: "SKL_BASIC", seq: 0 });
    a.send(Op.C_USE_SKILL, { skillId: "SKL_BASIC", seq: 0 });
    expect((await a.wait<{ code: number }>(Op.S_ERROR, (e) => e.code === ErrorCode.E_COOLDOWN)).code).toBe(2002);
    // Tụ Mana Chấn opens at Lv5
    a.send(Op.C_USE_SKILL, { skillId: "SKL_MANA_BURST", seq: 0 });
    await a.wait<{ code: number }>(Op.S_ERROR, (e) => e.code === ErrorCode.E_LEVEL_REQUIRED);
    a.close();
    b.close();
  });

  it("lets monsters fight back; a fallen player loses 2% EXP and revives in town", async () => {
    server.world.rng = ROLL;
    const c = await Client.open(server.port);
    const w = await c.join("Lộc", "VILLAGER");
    const p = playerOf(w.you);
    gainExp(p, 150 + 400, server.world.now); // Lv3
    gainExp(p, 100, server.world.now); // 100 EXP into Lv3
    expect(p.lv).toBe(3);
    const z = server.world.zone("M003", 2)!;
    const dog = [...z.mobs.values()].find((m) => m.def.id === "MOB003")!; // aggressive
    teleport(p, "M003", 2, dog.x + 60, dog.y - 10);
    await c.wait<SMapChange>(Op.S_MAP_CHANGE, (m) => m.map.id === "M003");
    p.hp = 1;
    const dogs = new Set([...z.mobs.values()].filter((m) => m.def.id === "MOB003").map((m) => m.id));
    const hit = await c.wait<SDamage>(Op.S_DAMAGE, (d) => d.targetId === p.id && d.sourceId > 0, 5000);
    expect(dogs.has(hit.sourceId)).toBe(true);
    expect(hit.miss).toBe(false);
    const died = await c.wait<SEntityDied>(Op.S_ENTITY_DIED, (d) => d.id === p.id);
    expect(died.exp).toBe(-Math.floor(expToNext(3) * 0.02));
    expect(p.exp).toBe(100 + died.exp!);
    expect([...z.mobs.values()].every((m) => m.targetId !== p.id)).toBe(true); // they lose interest
    c.send(Op.C_USE_SKILL, { skillId: "SKL_BASIC", seq: 0 });
    await c.wait<{ code: number }>(Op.S_ERROR, (e) => e.code === ErrorCode.E_DEAD);
    c.send(Op.C_REVIVE, { mode: "TOWN" });
    const back = await c.next<SMapChange>(Op.S_MAP_CHANGE);
    expect(back.map).toMatchObject({ id: "M001", zone: 2 });
    const rev = await c.wait<{ hp: number }>(Op.S_REVIVED);
    expect(rev.hp).toBe(p.stats.hp);
    c.close();
  });

  it("moves through portals, lists zones and changes zone; unopened maps are locked", async () => {
    const c = await Client.open(server.port);
    const w = await c.join("Mai");
    const p = playerOf(w.you);
    const m1 = server.world.content.maps.get("M001")!;
    const g = m1.portals.find((x) => x.id === "P01")!;
    teleport(p, "M001", 1, g.x + 32, g.y + g.h);
    await c.wait(Op.S_MAP_CHANGE);
    c.send(Op.C_USE_PORTAL, { portalId: "P01", seq: 0 });
    const m2 = await c.next<SMapChange>(Op.S_MAP_CHANGE);
    expect(m2.map).toEqual({ id: "M002", zone: 1, name: "Đồng Hoa Suối Mơ" });
    expect(Math.abs(m2.body.x - g.toX)).toBeLessThanOrEqual(2);
    c.send(Op.C_USE_PORTAL, { portalId: "P02", seq: 0 }); // far away on the other side
    await c.wait<{ code: number }>(Op.S_ERROR, (e) => e.code === ErrorCode.E_OUT_OF_RANGE);
    c.send(Op.C_REQUEST_ZONES);
    const list = await c.wait<SZoneList>(Op.S_ZONE_LIST);
    expect(list.mapId).toBe("M002");
    expect(list.zones.map((x) => x.zoneNo)).toEqual([1, 2, 3]);
    expect(list.zones[0]!.players).toBeGreaterThanOrEqual(1);
    c.send(Op.C_CHANGE_ZONE, { zoneNo: 2 });
    const z2 = await c.next<SMapChange>(Op.S_MAP_CHANGE);
    expect(z2.map).toMatchObject({ id: "M002", zone: 2 });
    expect(z2.entities.some((e) => e.kind === "mob")).toBe(true);
    p.lastCombat = server.world.now;
    c.send(Op.C_CHANGE_ZONE, { zoneNo: 1 });
    await c.wait<{ code: number }>(Op.S_ERROR, (e) => e.code === ErrorCode.E_IN_COMBAT);
    // M009 Đồng Lúa leads on to M010, which opens in step B5.2
    const m9 = server.world.content.maps.get("M009")!;
    const toM10 = m9.portals.find((x) => x.to === "M010")!;
    teleport(p, "M009", 1, toM10.x + 32, toM10.y + toM10.h);
    await c.next(Op.S_MAP_CHANGE);
    c.send(Op.C_USE_PORTAL, { portalId: toM10.id, seq: 0 });
    const locked = await c.wait<{ code: number; message: string }>(
      Op.S_ERROR,
      (e) => e.code === ErrorCode.E_MAP_LOCKED,
    );
    expect(locked.message).toBe("MAP_NOT_OPEN:M010");
    c.close();
  });

  it("sends map chat to the same zone only, at most one message per second", async () => {
    const a = await Client.open(server.port),
      b = await Client.open(server.port),
      c = await Client.open(server.port);
    const wa = await a.join("Nam"),
      wb = await b.join("Oanh"),
      wc = await c.join("Phúc");
    const z = playerOf(wa.you).zone!.zoneNo;
    expect(playerOf(wb.you).zone!.zoneNo).toBe(z);
    const pc = playerOf(wc.you);
    teleport(pc, "M001", z === 3 ? 2 : 3, pc.body.x, pc.body.y);
    await c.wait(Op.S_MAP_CHANGE);
    a.send(Op.C_CHAT_SEND, { channel: "MAP", text: "  Chào   cả nhà  " });
    const got = await b.wait<{ fromName: string; text: string; channel: string }>(
      Op.S_CHAT_MSG,
      (m) => m.channel === "MAP",
    );
    expect(got).toMatchObject({ fromName: "Nam", text: "Chào cả nhà" });
    await a.wait(Op.S_CHAT_MSG, (m: { text: string }) => m.text === "Chào cả nhà");
    a.send(Op.C_CHAT_SEND, { channel: "MAP", text: "lần hai" });
    await a.wait<{ code: number }>(Op.S_ERROR, (e) => e.code === ErrorCode.E_RATE_LIMIT);
    a.send(Op.C_CHAT_SEND, { channel: "MAP", text: "a\u0007b" });
    await a.wait<{ code: number }>(Op.S_ERROR, (e) => e.code === ErrorCode.E_INVALID_PAYLOAD);
    await sleep(200);
    expect(c.frames.some((f) => f.op === Op.S_CHAT_MSG && (f.payload as { channel: string }).channel === "MAP")).toBe(
      false,
    );
    a.close();
    b.close();
    c.close();
  });

  it("picks up drops (locked to the top damage dealer) and drinks potions", async () => {
    const a = await Client.open(server.port),
      b = await Client.open(server.port);
    const wa = await a.join("Quân", "ANCIENT"),
      wb = await b.join("Sang");
    const pa = playerOf(wa.you),
      pb = playerOf(wb.you);
    teleport(pa, "M002", 1, 600, 512);
    teleport(pb, "M002", 1, 620, 512);
    await a.wait(Op.S_MAP_CHANGE);
    const z = pa.zone!,
      w = server.world;
    const y = pa.body.y;
    const coins = new Drop(w.nextId(), { kind: "soft", qty: 12 }, pa.body.x, y, pa.id, w.now + 15000, w.now + 60000);
    const pots = new Drop(
      w.nextId(),
      { kind: "item", item: "potion_hp", qty: 2 },
      pa.body.x,
      y,
      pa.id,
      w.now + 15000,
      w.now + 60000,
    );
    z.drops.set(coins.id, coins);
    z.drops.set(pots.id, pots);
    const seen = await b.wait<{ id: number; what: { name: string }; lockedMs: number; ownerId: number }>(
      Op.S_DROP_SPAWN,
      (d) => d.id === pots.id,
    );
    expect(seen).toMatchObject({ what: { name: "Bình HP Nhỏ" }, ownerId: pa.id });
    expect(seen.lockedMs).toBeGreaterThan(14000);
    b.send(Op.C_PICKUP, { dropId: pots.id });
    const lockedErr = await b.wait<{ code: number; message: string }>(
      Op.S_ERROR,
      (e) => e.code === ErrorCode.E_INVALID_TARGET,
    );
    expect(lockedErr.message).toBe("DROP_LOCKED");
    a.send(Op.C_PICKUP, { dropId: coins.id });
    a.send(Op.C_PICKUP, { dropId: pots.id });
    const soft = await a.wait<SInventoryDelta>(Op.S_INVENTORY_DELTA, (d) => d.picked?.kind === "soft");
    expect(soft.soft).toBe(12);
    const pot = await a.wait<SInventoryDelta>(Op.S_INVENTORY_DELTA, (d) => d.add.length === 1);
    expect(pot.add[0]).toMatchObject({ item: "potion_hp", qty: 2, healHp: 150 });
    await b.wait<{ ids: number[] }>(Op.S_ENTITY_DESPAWN, (d) => d.ids.includes(pots.id));
    pa.hp = 10;
    a.send(Op.C_USE_ITEM, { instanceId: pot.add[0]!.instanceId });
    const heal = await a.wait<{ amount: number; kind: string }>(Op.S_HEAL);
    expect(heal).toMatchObject({ kind: "hp", amount: Math.round(150 * 1.15) }); // Ấn Cổ Hộ Thân +15%
    a.send(Op.C_USE_ITEM, { instanceId: pot.add[0]!.instanceId });
    await a.wait<{ code: number }>(Op.S_ERROR, (e) => e.code === ErrorCode.E_COOLDOWN);
    expect(pa.bag.items[0]!.qty).toBe(1);
    a.close();
    b.close();
  });

  it("hurts a player standing on a hazard tile and caps the level at Lv9 before the ceremony", async () => {
    const c = await Client.open(server.port);
    const w = await c.join("Tâm");
    const p = playerOf(w.you);
    teleport(p, "M004", 1, 31 * 32 + 16, 21 * 32);
    await c.wait<SMapChange>(Op.S_MAP_CHANGE, (m) => m.map.id === "M004");
    for (let i = 1; i <= 6; i++) {
      c.send(Op.C_MOVE_INPUT, { seq: i, dir: 0, jump: 0, down: 0, tickClient: i });
      await sleep(50);
    }
    const hurt = await c.wait<SDamage>(Op.S_DAMAGE, (d) => d.targetId === p.id && d.sourceId === 0);
    expect(hurt.amount).toBe(Math.round(p.stats.hp * 0.08));
    gainExp(p, 10_000_000, server.world.now);
    expect(p.lv).toBe(9);
    expect(p.exp).toBe(expToNext(9) - 1);
    await c.wait<{ level: number }>(Op.S_LEVEL_UP, (l) => l.level === 9);
    c.close();
  });
});

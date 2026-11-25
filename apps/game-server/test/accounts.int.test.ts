import {
  createAccount,
  createCharacter,
  createDb,
  type Db,
  grantItem,
  ledgerMismatches,
  migrate,
  resetSchema,
  seed,
  setClass,
  tx,
} from "@htk/db";
import {
  ErrorCode,
  expToNext,
  type Loot,
  Op,
  PROTOCOL_VERSION,
  type SNpcDialog,
  type SQuestUpdate,
  type SChatMsg,
  type SInventoryDelta,
  type SStatsUpdate,
} from "@htk/shared";
import { Redis } from "ioredis";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { gainExp } from "../src/world/combat";
import { Drop, type Player } from "../src/world/entities";
import { type GameServer, startGameServer } from "../src/server";
import { Client } from "./helpers/client";

// Integration (pnpm test:int): accounts on a real PostgreSQL and Redis (step B3, server-design §7-8).
const DB_URL = process.env.TEST_DATABASE_URL ?? "postgresql://htk:htk@localhost:5432/htk_test";
const REDIS_URL = process.env.TEST_REDIS_URL ?? "redis://localhost:6379/15";
const db: Db = createDb(DB_URL);
const redis = new Redis(REDIS_URL);
let server: GameServer;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const start = () =>
  startGameServer({
    port: 0,
    mapId: "M001",
    devGuest: false,
    seed: 7,
    realmId: 1,
    databaseUrl: DB_URL,
    redisUrl: REDIS_URL,
    log: () => {},
  });

beforeAll(async () => {
  await resetSchema(db);
  await migrate(db);
  await seed(db);
  await redis.flushdb();
  server = await start();
});
afterAll(async () => {
  await server.close();
  await db.end();
  redis.disconnect();
});

let n = 0;
/** what the API does: an account, a character with the starting kit, a 30 s ticket in Redis */
async function newCharacter(name: string, origin: "VILLAGER" | "NOBLE" | "ANCIENT" = "VILLAGER") {
  const a = await createAccount(db, { username: `u${++n}`, email: `u${n}@example.test`, passwordHash: "x" });
  const c = await createCharacter(db, {
    accountId: a.id,
    realmId: 1,
    name,
    gender: "M",
    origin,
    hp: 220,
    mp: 70,
    starter: [
      { templateId: "potion_hp", qty: 3, stack: 999 },
      { templateId: "potion_mp", qty: 3, stack: 999 },
    ],
    bagSize: 30,
  });
  return { accountId: a.id, characterId: c.id };
}
async function ticket(t: { accountId: string; characterId: string }): Promise<string> {
  const k = `tk${Math.random().toString(36).slice(2)}xxxxxxxxxxxx`;
  await redis.set(`ticket:${k}`, JSON.stringify({ ...t, realmId: 1, ipHash: "" }), "EX", 30);
  return k;
}
const playerOf = (id: number): Player => {
  for (const s of server.sessions) if (s.entity?.id === id) return s.entity;
  throw new Error(`no player ${id}`);
};
const row = async (id: string) => (await db.query("SELECT * FROM characters WHERE id = $1", [id])).rows[0];
const bag = async (id: string) =>
  (
    await db.query(
      "SELECT template_id, qty, rarity, item_level FROM item_instances WHERE holder_id = $1 ORDER BY slot",
      [id],
    )
  ).rows;

describe("accounts in the game server (step B3)", () => {
  it("enters with a one-use ticket and the saved character", async () => {
    const ids = await newCharacter("Hải Đăng");
    const tk = await ticket(ids);
    const c = await Client.open(server.port);
    const w = await c.enter(tk);
    expect(w.character.name).toBe("Hải Đăng");
    expect(w.stats).toMatchObject({ lv: 1, statPoints: 10, maxHp: 220 });
    expect(w.bag.items.map((i) => [i.item, i.qty])).toEqual([
      ["potion_hp", 3],
      ["potion_mp", 3],
    ]);
    expect(w.bag.items[0]!.instanceId).toMatch(/^[0-9a-f-]{36}$/);
    const again = await Client.open(server.port);
    again.send(Op.C_HELLO, { ticket: tk, clientVersion: "t", protocolVersion: PROTOCOL_VERSION });
    expect((await again.wait<{ code: number }>(Op.S_ERROR)).code).toBe(ErrorCode.E_AUTH);
    c.close();
  });

  it("spends points, picks up with a ledger row, drinks, levels up, and finds it all after signing in again", async () => {
    const ids = await newCharacter("Gia Bảo", "ANCIENT");
    const c = await Client.open(server.port);
    const w = await c.enter(await ticket(ids));
    const p = playerOf(w.you);
    c.send(Op.C_ALLOCATE_POINTS, { hp: 4, mp: 0, atk: 4, def: 2, crit: 0 });
    const st = await c.wait<SStatsUpdate>(Op.S_STATS_UPDATE, (s) => s.statPoints === 0);
    expect(st.pts).toEqual({ hp: 4, mp: 0, atk: 4, def: 2, crit: 0 });
    expect(await row(ids.characterId)).toMatchObject({ stat_points: 0, pts_hp: 4, pts_atk: 4, pts_def: 2 });
    c.send(Op.C_ALLOCATE_POINTS, { hp: 1, mp: 0, atk: 0, def: 0, crit: 0 });
    expect((await c.wait<{ message: string }>(Op.S_ERROR)).message).toBe("NOT_ENOUGH_POINTS");

    // three drops at the feet: Quan, potions (they join the stack), a rare hat Lv3
    const z = p.zone!,
      wd = server.world;
    const drops = [
      { kind: "soft", qty: 15 },
      { kind: "item", item: "potion_hp", qty: 2 },
      {
        kind: "gear",
        item: "s1_hat",
        level: 3,
        rarity: "rare",
        affixes: [
          ["hp", 24],
          ["crit", 0.01],
        ],
      },
    ] satisfies Loot[];
    const made = drops.map((l) => new Drop(wd.nextId(), l, p.body.x, p.body.y, p.id, wd.now + 15000, wd.now + 60000));
    for (const d of made) z.drops.set(d.id, d);
    for (const d of made) c.send(Op.C_PICKUP, { dropId: d.id });
    await c.wait<SInventoryDelta>(Op.S_INVENTORY_DELTA, (d) => d.picked?.kind === "gear");
    expect((await row(ids.characterId)).soft_currency).toBe(15);
    const ledger = await db.query(
      "SELECT delta, balance_after, reason, idem_key FROM currency_ledger WHERE owner_id = $1",
      [ids.characterId],
    );
    expect(ledger.rows).toEqual([{ delta: 15, balance_after: 15, reason: "MOB_DROP", idem_key: made[0]!.key }]);
    expect(await bag(ids.characterId)).toEqual([
      { template_id: "potion_hp", qty: 5, rarity: 0, item_level: 1 },
      { template_id: "potion_mp", qty: 3, rarity: 0, item_level: 1 },
      { template_id: "s1_hat", qty: 1, rarity: 2, item_level: 3 },
    ]);
    // a drop cannot be picked twice, even by a crafted packet
    c.send(Op.C_PICKUP, { dropId: made[0]!.id });
    expect((await c.wait<{ message: string }>(Op.S_ERROR, (e) => e.message === "DROP_GONE")).message).toBe("DROP_GONE");

    p.hp = 50;
    c.send(Op.C_USE_ITEM, { instanceId: p.bag.items.find((i) => i.item === "potion_hp")!.instanceId });
    await c.wait(Op.S_HEAL);
    await sleep(100);
    expect((await bag(ids.characterId))[0].qty).toBe(4);

    gainExp(p, expToNext(1) + 20, wd.now);
    await sleep(200);
    expect(await row(ids.characterId)).toMatchObject({ level: 2, exp: 20, stat_points: 5 }); // written at once

    server.world.transfer(p, server.world.zone("M002", 2)!, 600, 512);
    await c.wait(Op.S_MAP_CHANGE);
    c.close();
    await sleep(300);
    expect(await row(ids.characterId)).toMatchObject({ map_id: "M002", pos_x: 600 });

    const back = await Client.open(server.port);
    const w2 = await back.enter(await ticket(ids));
    expect(w2.map.id).toBe("M002");
    expect(Math.abs(w2.body.x - 600)).toBeLessThanOrEqual(2);
    expect(w2.stats).toMatchObject({ lv: 2, statPoints: 5, pts: { hp: 4, mp: 0, atk: 4, def: 2, crit: 0 } });
    expect(w2.bag.soft).toBe(15);
    expect(w2.bag.items.map((i) => [i.item, i.qty, i.rarity ?? null])).toEqual([
      ["potion_hp", 4, null],
      ["potion_mp", 3, null],
      ["s1_hat", 1, "rare"],
    ]);
    back.close();
  });

  it("kicks the old session on a second sign-in, after saving it", async () => {
    const ids = await newCharacter("Khánh An");
    const a = await Client.open(server.port);
    const wa = await a.enter(await ticket(ids));
    gainExp(playerOf(wa.you), 33, server.world.now);
    const b = await Client.open(server.port);
    const wb = await b.enter(await ticket(ids));
    const kick = await a.wait<{ reason: string }>(Op.S_KICK);
    expect(kick.reason).toBe("DUPLICATE_LOGIN");
    await sleep(100);
    expect(a.closed).toBe(true);
    expect(wb.stats.exp).toBe(33); // the old session's write-behind finished first
    expect(server.world.accounts.size).toBeGreaterThanOrEqual(1);
    b.close();
  });

  it("carries world chat across maps, one message per 10 seconds", async () => {
    const x = await Client.open(server.port),
      y = await Client.open(server.port);
    const wx = await x.enter(await ticket(await newCharacter("Lam Tuyền")));
    await y.enter(await ticket(await newCharacter("Mộc Miên")));
    server.world.transfer(playerOf(wx.you), server.world.zone("M003", 3)!, 400, 600);
    await x.wait(Op.S_MAP_CHANGE);
    x.send(Op.C_CHAT_SEND, { channel: "WORLD", text: "Ai đi Hang Giếng Cạn không?" });
    const got = await y.wait<SChatMsg>(Op.S_CHAT_MSG, (m) => m.channel === "WORLD");
    expect(got).toMatchObject({ fromName: "Lam Tuyền", text: "Ai đi Hang Giếng Cạn không?" });
    x.send(Op.C_CHAT_SEND, { channel: "WORLD", text: "lần nữa" });
    expect((await x.wait<{ message: string }>(Op.S_ERROR)).message).toBe("WORLD_CHAT_TOO_FAST");
    x.close();
    y.close();
  });

  it("saves everyone when the server shuts down", async () => {
    const other = await start();
    const ids = await newCharacter("Ngọc Lan");
    const c = await Client.open(other.port);
    const w = await c.enter(await ticket(ids));
    let p: Player | undefined;
    for (const s of other.sessions) if (s.entity?.id === w.you) p = s.entity;
    gainExp(p!, 77, other.world.now);
    await other.close();
    expect((await c.wait<{ reason: string }>(Op.S_KICK)).reason).toBe("SHUTDOWN");
    expect((await row(ids.characterId)).exp).toBe(77);
  });

  it("keeps quests, worn gear, shop trades and the class across sign-ins (step B4)", async () => {
    const ids = await newCharacter("Bạch Trà");
    const c = await Client.open(server.port);
    const w = await c.enter(await ticket(ids));
    const p = playerOf(w.you);
    const talk = async (npc: string, map = "M001") => {
      const n = server.world.content.maps.get(map)!.npcs.find((x) => x.id === npc)!;
      if (p.zone?.mapId !== map || Math.abs(p.body.x - n.x) > 60) {
        server.world.transfer(p, server.world.zone(map, 1)!, n.x + 10, n.y);
        await c.next(Op.S_MAP_CHANGE);
      }
      const d = c.next<SNpcDialog>(Op.S_NPC_DIALOG, (x) => x.npcId === npc);
      c.send(Op.C_NPC_INTERACT, { npcId: npc });
      return d;
    };
    // Q_MAIN_01 accepted and turned in: 100 Quan with a QUEST_REWARD ledger row
    await talk("NPC001");
    c.send(Op.C_NPC_CHOICE, { npcId: "NPC001", optionId: "ACCEPT" });
    await c.wait<SQuestUpdate>(Op.S_QUEST_UPDATE, (u) => u.event?.kind === "accepted");
    await talk("NPC002");
    await c.wait<SQuestUpdate>(Op.S_QUEST_UPDATE, (u) => u.main?.status === "READY");
    await talk("NPC001");
    const done = c.next<SQuestUpdate>(Op.S_QUEST_UPDATE, (u) => u.event?.kind === "completed");
    c.send(Op.C_NPC_CHOICE, { npcId: "NPC001", optionId: "TURNIN" });
    await done;
    // a second turn-in changes nothing (the quest row is COMPLETED, the ledger key is used)
    c.send(Op.C_NPC_CHOICE, { npcId: "NPC001", optionId: "TURNIN" });
    await c.next<{ code: number }>(Op.S_ERROR);
    expect((await row(ids.characterId)).soft_currency).toBe(100);
    // Q_MAIN_02 accepted, one kill counted (saved with the write-behind)
    await talk("NPC001");
    c.send(Op.C_NPC_CHOICE, { npcId: "NPC001", optionId: "ACCEPT" });
    await c.wait<SQuestUpdate>(Op.S_QUEST_UPDATE, (u) => u.main?.id === "Q_MAIN_02" && u.main.status === "ACTIVE");
    server.world.quests.event(p, "KILL", "MOB001");
    // buy at Lam Nhi, wear a hat
    await talk("NPC003");
    c.send(Op.C_SHOP_BUY, { shopId: "NPC003", itemId: "potion_mp", qty: 2, idemKey: crypto.randomUUID() });
    await c.wait<SInventoryDelta>(Op.S_INVENTORY_DELTA, (d) => d.soft === 68);
    await tx(db, (t) =>
      grantItem(t, ids.characterId, {
        templateId: "s1_hat",
        qty: 1,
        rarity: 1,
        itemLevel: 1,
        affixes: [["mp", 5]],
        bagSize: 30,
      }),
    );
    c.close();
    await sleep(300);
    const again = await Client.open(server.port);
    const w2 = await again.enter(await ticket(ids));
    const hat = w2.bag.items.find((i) => i.item === "s1_hat")!;
    expect(hat).toMatchObject({ slot: "hat", rarity: "good", affixes: [["mp", 5]], sell: 25 });
    again.send(Op.C_EQUIP, { instanceId: hat.instanceId });
    await again.wait<SInventoryDelta>(Op.S_INVENTORY_DELTA, (d) => !!d.equip?.hat);
    const p2 = playerOf(w2.you);
    await setClass(db, ids.characterId, "WATER");
    again.close();
    await sleep(300);
    const third = await Client.open(server.port);
    const w3 = await third.enter(await ticket(ids));
    expect(w3.quests.main).toMatchObject({ id: "Q_MAIN_02", status: "ACTIVE", objectives: [{ got: 1 }] });
    expect(w3.quests.done).toBe(1);
    expect(w3.equipment.hat?.instanceId).toBe(hat.instanceId);
    expect(w3.character.cls).toBe("WATER");
    expect(w3.skills.map((s) => s.id)).toContain("SKL_WATER_1");
    expect(w3.stats.maxMp).toBeGreaterThan(p2.stats.mp);
    const ledger = await db.query("SELECT reason, delta FROM currency_ledger WHERE owner_id = $1 ORDER BY id", [
      ids.characterId,
    ]);
    expect(ledger.rows).toEqual([
      { reason: "QUEST_REWARD", delta: 100 },
      { reason: "SHOP_BUY", delta: -32 },
    ]);
    expect(await ledgerMismatches(db)).toEqual([]);
    third.close();
  });
});

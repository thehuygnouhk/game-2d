import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  addSoft,
  BagFullError,
  consumeOne,
  createAccount,
  createCharacter,
  createDb,
  type Db,
  equipItem,
  findAccountByLogin,
  grantEquipped,
  saveQuest,
  setClass,
  takeItem,
  unequipItem,
  grantItem,
  ledgerMismatches,
  loadCharacter,
  lockCharacter,
  migrate,
  pgCode,
  resetSchema,
  saveCharacterState,
  seed,
  spendPoints,
  tx,
} from "../src";

// Integration tests: a real PostgreSQL 16 (pnpm test:int). TEST_DATABASE_URL points at a throwaway database.
const URL = process.env.TEST_DATABASE_URL ?? "postgresql://htk:htk@localhost:5432/htk_test";
const here = path.dirname(fileURLToPath(import.meta.url));
let db: Db;

beforeAll(async () => {
  db = createDb(URL);
  await resetSchema(db);
  expect(await migrate(db)).toEqual(["0001_init"]);
  await seed(db);
});
afterAll(async () => {
  await db.end();
});

const newAccount = (n: string) => createAccount(db, { username: n, email: `${n}@example.test`, passwordHash: "x" });
const newChar = async (name: string) => {
  const a = await newAccount(`acc_${name.toLowerCase()}`);
  return createCharacter(db, {
    accountId: a.id,
    realmId: 1,
    name,
    gender: "F",
    origin: "NOBLE",
    hp: 300,
    mp: 120,
    starter: [
      { templateId: "potion_hp", qty: 3, stack: 999 },
      { templateId: "potion_mp", qty: 3, stack: 999 },
    ],
    bagSize: 30,
  });
};

describe("schema (database-schema §3-4)", () => {
  it("is up to date after a second migrate", async () => {
    expect(await migrate(db)).toEqual([]);
  });

  it("matches the documented DDL column for column", async () => {
    const doc = readFileSync(path.resolve(here, "../../../docs/architecture/database-schema.md"), "utf8");
    const part = doc.slice(doc.indexOf("## 3."), doc.indexOf("## 5."));
    const ddl = [...part.matchAll(/```sql\n([\s\S]*?)```/g)].map((m) => m[1]).join("\n");
    const admin = new pg.Client({ connectionString: URL });
    await admin.connect();
    const name = `htk_doc_${process.pid}`;
    await admin.query(`DROP DATABASE IF EXISTS ${name}`);
    await admin.query(`CREATE DATABASE ${name}`);
    const docUrl = URL.replace(/\/[^/]*$/, `/${name}`);
    const docDb = new pg.Client({ connectionString: docUrl });
    try {
      await docDb.connect();
      await docDb.query(ddl); // CLAUDE.md: the documented DDL runs on PostgreSQL 16
      const cols = async (c: Pick<pg.Client, "query">) =>
        (
          await c.query(
            `SELECT table_name, column_name, data_type, is_nullable, column_default FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name <> 'schema_migrations' ORDER BY table_name, ordinal_position`,
          )
        ).rows;
      const mine = await cols(db);
      const tables = new Set(mine.map((r) => r.table_name));
      const theirs = (await cols(docDb)).filter((r) => tables.has(r.table_name));
      expect(mine).toEqual(theirs);
      expect([...tables].sort()).toEqual([
        "accounts",
        "auth_sessions",
        "character_quests",
        "character_skills",
        "characters",
        "currency_ledger",
        "item_instances",
        "realms",
      ]);
    } finally {
      await docDb.end();
      await admin.query(`DROP DATABASE IF EXISTS ${name}`);
      await admin.end();
    }
  });
});

describe("accounts and characters", () => {
  it("keeps usernames and character names unique, case-insensitive", async () => {
    await newAccount("lanha");
    await expect(newAccount("LanHa")).rejects.toSatisfy((e) => pgCode(e) === "23505");
    expect((await findAccountByLogin(db, "LANHA@example.test"))?.username).toBe("lanha");
    await newChar("Mai Anh");
    await expect(newChar("mai anh")).rejects.toSatisfy((e) => pgCode(e) === "23505");
  });

  it("creates a character with its starting potions, 10 free points and saves its state", async () => {
    const c = await newChar("Bảo Ngọc");
    expect(c).toMatchObject({ level: 1, stat_points: 10, soft_currency: 0, map_id: "M001" });
    const loaded = (await loadCharacter(db, c.id))!;
    expect(loaded.bag.map((i) => [i.template_id, i.qty, i.slot])).toEqual([
      ["potion_hp", 3, 0],
      ["potion_mp", 3, 1],
    ]);
    await saveCharacterState(db, c.id, {
      level: 3,
      exp: 40,
      hp: 250.4,
      mp: 99.6,
      mapId: "M002",
      x: 400,
      y: 512,
      playSeconds: 60,
    });
    expect((await loadCharacter(db, c.id))!.char).toMatchObject({
      level: 3,
      exp: 40,
      hp: 250,
      mp: 100,
      map_id: "M002",
      pos_x: 400,
    });
    expect(await spendPoints(db, c.id, { hp: 4, mp: 0, atk: 4, def: 2, crit: 0 })).toMatchObject({
      stat_points: 0,
      pts_atk: 4,
    });
    expect(await spendPoints(db, c.id, { hp: 1, mp: 0, atk: 0, def: 0, crit: 0 })).toBeNull();
  });
});

describe("items and the ledger (CLAUDE.md rule 5)", () => {
  it("stacks potions, fills free slots and refuses a full bag", async () => {
    const c = await newChar("Cẩm Tú");
    await tx(db, async (t) => {
      await lockCharacter(t, c.id);
      const r = await grantItem(t, c.id, { templateId: "potion_hp", qty: 2, stack: 999, bagSize: 30 });
      expect(r.map((x) => x.qty)).toEqual([5]);
      const gear = await grantItem(t, c.id, { templateId: "s1_hat", qty: 1, rarity: 1, itemLevel: 3, bagSize: 30 });
      expect(gear[0]).toMatchObject({ slot: 2, rarity: 1, item_level: 3 });
    });
    await expect(
      tx(db, async (t) => {
        await lockCharacter(t, c.id);
        await grantItem(t, c.id, { templateId: "s1_boots", qty: 28, bagSize: 30 });
      }),
    ).rejects.toBeInstanceOf(BagFullError);
    expect((await loadCharacter(db, c.id))!.bag).toHaveLength(3); // rolled back as a whole
    const potion = (await loadCharacter(db, c.id))!.bag.find((i) => i.template_id === "potion_mp")!;
    for (let i = 3; i > 0; i--) {
      const after = await tx(db, (t) => consumeOne(t, c.id, potion.id));
      expect(after?.qty).toBe(i - 1);
    }
    expect(await tx(db, (t) => consumeOne(t, c.id, potion.id))).toBeNull();
  });

  it("moves Quan only with a ledger row, once per idemKey, never below zero, even in parallel", async () => {
    const c = await newChar("Đức Huy");
    const key = "6f1b4c4e-2d3a-4a5b-9c8d-7e6f5a4b3c2d";
    const pick = () =>
      tx(db, async (t) => {
        await lockCharacter(t, c.id);
        return addSoft(t, c.id, 12, "MOB_DROP", { type: "DROP", id: "d1" }, key);
      });
    expect(await pick()).toEqual({ balance: 12, duplicate: false });
    expect(await pick()).toEqual({ balance: 12, duplicate: true });
    await Promise.all(
      Array.from({ length: 20 }, () =>
        tx(db, async (t) => {
          await lockCharacter(t, c.id);
          await addSoft(t, c.id, 1, "MOB_DROP");
        }),
      ),
    );
    await expect(
      tx(db, async (t) => {
        await lockCharacter(t, c.id);
        await addSoft(t, c.id, -1000, "SHOP_BUY");
      }),
    ).rejects.toSatisfy((e) => pgCode(e) === "23514");
    expect((await loadCharacter(db, c.id))!.char.soft_currency).toBe(32);
    const rows = await db.query("SELECT count(*)::int AS n FROM currency_ledger WHERE owner_id = $1", [c.id]);
    expect(rows.rows[0].n).toBe(21);
    expect(await ledgerMismatches(db)).toEqual([]);
  });

  it("wears, swaps and takes off equipment (step B4, items §3)", async () => {
    const c = await newChar("Mặc Đồ");
    const [a] = await tx(db, (t) =>
      grantItem(t, c.id, { templateId: "s1_hat", qty: 1, rarity: 1, itemLevel: 4, affixes: [["hp", 32]], bagSize: 30 }),
    );
    const [b] = await tx(db, (t) => grantItem(t, c.id, { templateId: "s1_hat", qty: 1, itemLevel: 5, bagSize: 30 }));
    expect(a!.affixes).toEqual([["hp", 32]]);
    const worn = await tx(db, (t) => equipItem(t, c.id, a!.id, 1));
    expect(worn).toMatchObject([{ id: a!.id, location: "EQUIP", slot: 1 }]);
    const swap = await tx(db, (t) => equipItem(t, c.id, b!.id, 1));
    expect(swap).toMatchObject([
      { id: b!.id, location: "EQUIP", slot: 1 },
      { id: a!.id, location: "BAG", slot: b!.slot },
    ]);
    const off = await tx(db, (t) => unequipItem(t, c.id, 1, 30));
    expect(off).toMatchObject({ id: b!.id, location: "BAG" });
    const full = await tx(db, (t) => equipItem(t, c.id, a!.id, 1));
    expect(full).toHaveLength(1);
    await expect(tx(db, (t) => unequipItem(t, c.id, 1, 3))).rejects.toBeInstanceOf(BagFullError);
    const tome = await tx(db, (t) =>
      grantEquipped(t, c.id, { templateId: "huyen_thu_so_ban", slot: 4, rarity: 0, itemLevel: 10, bound: true }),
    );
    const loaded = (await loadCharacter(db, c.id))!;
    expect(
      loaded.bag
        .filter((r) => r.location === "EQUIP")
        .map((r) => r.id)
        .sort(),
    ).toEqual([a!.id, tome.id].sort());
    const potion = loaded.bag.find((r) => r.template_id === "potion_hp")!;
    expect(await tx(db, (t) => takeItem(t, c.id, potion.id, 5))).toBeNull();
    expect(await tx(db, (t) => takeItem(t, c.id, potion.id, 2))).toMatchObject({ qty: 1 });
  });

  it("keeps quest rows and never reopens a completed quest (step B4, quests §2)", async () => {
    const c = await newChar("Nhiệm Vụ");
    expect(await saveQuest(db, c.id, { quest_id: "Q_MAIN_01", status: "ACCEPTED", progress: [0] })).toBe(true);
    expect(await saveQuest(db, c.id, { quest_id: "Q_MAIN_01", status: "COMPLETED", progress: [1] })).toBe(true);
    expect(await saveQuest(db, c.id, { quest_id: "Q_MAIN_01", status: "READY", progress: [1] })).toBe(false);
    expect((await loadCharacter(db, c.id))!.quests).toEqual([
      { quest_id: "Q_MAIN_01", status: "COMPLETED", progress: [1] },
    ]);
    await setClass(db, c.id, "FIRE");
    const first = (await loadCharacter(db, c.id))!.char;
    await setClass(db, c.id, "WATER");
    const again = (await loadCharacter(db, c.id))!.char;
    expect([first.class, again.class]).toEqual(["FIRE", "WATER"]);
    expect(again.class_changed_at).toEqual(first.class_changed_at);
  });
});

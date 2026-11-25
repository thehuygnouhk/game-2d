import { grantItem, ITEM_COLS, type ItemRow } from "./items";
import type { Db, Queryable, Tx } from "./index";
import { tx } from "./index";

/** characters (database-schema §4.2). Money changes only through ledger.ts, never through saveState. */
export interface CharacterRow {
  id: string;
  account_id: string;
  realm_id: number;
  name: string;
  gender: "M" | "F";
  origin: "VILLAGER" | "NOBLE" | "ANCIENT";
  class: string;
  level: number;
  exp: number;
  soft_currency: number;
  stat_points: number;
  pts_hp: number;
  pts_mp: number;
  pts_atk: number;
  pts_def: number;
  pts_crit: number;
  hp: number;
  mp: number;
  map_id: string;
  pos_x: number;
  pos_y: number;
  play_seconds: number;
  class_changed_at: Date | null;
}
export type CharacterSummary = Pick<CharacterRow, "id" | "name" | "gender" | "origin" | "class" | "level" | "map_id">;

const COLS = `id, account_id, realm_id, name, gender, origin, class, level, exp, soft_currency, stat_points,
  pts_hp, pts_mp, pts_atk, pts_def, pts_crit, hp, mp, map_id, pos_x, pos_y, play_seconds, class_changed_at`;

export async function listCharacters(q: Queryable, accountId: string, realmId: number): Promise<CharacterSummary[]> {
  const r = await q.query<CharacterSummary>(
    `SELECT id, name, gender, origin, class, level, map_id FROM characters
     WHERE account_id = $1 AND realm_id = $2 AND deleted_at IS NULL ORDER BY created_at`,
    [accountId, realmId],
  );
  return r.rows;
}

/** Create a character with its starting items (classes §2.1) in one transaction. Name clash → pg 23505. */
export async function createCharacter(
  db: Db,
  c: {
    accountId: string;
    realmId: number;
    name: string;
    gender: "M" | "F";
    origin: CharacterRow["origin"];
    hp: number;
    mp: number;
    starter: { templateId: string; qty: number; stack?: number }[];
    bagSize: number;
  },
): Promise<CharacterRow> {
  return tx(db, async (t) => {
    const r = await t.query<CharacterRow>(
      `INSERT INTO characters (account_id, realm_id, name, gender, origin, hp, mp)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING ${COLS}`,
      [c.accountId, c.realmId, c.name, c.gender, c.origin, c.hp, c.mp],
    );
    const row = r.rows[0]!;
    for (const s of c.starter) await grantItem(t, row.id, { ...s, bagSize: c.bagSize });
    return row;
  });
}

export async function findCharacter(q: Queryable, id: string): Promise<CharacterRow | null> {
  const r = await q.query<CharacterRow>(`SELECT ${COLS} FROM characters WHERE id = $1 AND deleted_at IS NULL`, [id]);
  return r.rows[0] ?? null;
}

/** Everything the game server needs to put the character in the world (database-schema §5: one load). */
export async function loadCharacter(
  q: Queryable,
  id: string,
): Promise<{ char: CharacterRow; bag: ItemRow[]; quests: QuestRow[] } | null> {
  const [c, items, quests] = await Promise.all([
    findCharacter(q, id),
    q.query<ItemRow>(
      `SELECT ${ITEM_COLS} FROM item_instances
       WHERE holder_id = $1 AND location IN ('BAG', 'EQUIP') ORDER BY location, slot`,
      [id],
    ),
    loadQuests(q, id),
  ]);
  return c ? { char: c, bag: items.rows, quests } : null;
}

/** character_quests (database-schema §4.2, quests §2). Step B4 keeps one row per quest (reset_key ''). */
export interface QuestRow {
  quest_id: string;
  status: "ACCEPTED" | "IN_PROGRESS" | "READY" | "COMPLETED" | "ABANDONED" | "FAILED";
  progress: number[];
}
export async function loadQuests(q: Queryable, id: string): Promise<QuestRow[]> {
  const r = await q.query<QuestRow>(
    "SELECT quest_id, status, progress FROM character_quests WHERE character_id = $1 AND reset_key = ''",
    [id],
  );
  return r.rows;
}
/** Insert or update a quest row; a COMPLETED row never goes back (it returns false then). */
export async function saveQuest(q: Queryable, id: string, row: QuestRow): Promise<boolean> {
  const r = await q.query(
    `INSERT INTO character_quests (character_id, quest_id, status, progress, reset_key, completed_at)
     VALUES ($1, $2, $3::quest_status, $4, '', CASE WHEN $3::quest_status = 'COMPLETED' THEN now() END)
     ON CONFLICT (character_id, quest_id, reset_key) DO UPDATE
       SET status = EXCLUDED.status, progress = EXCLUDED.progress, completed_at = EXCLUDED.completed_at
       WHERE character_quests.status <> 'COMPLETED'`,
    [id, row.quest_id, row.status, JSON.stringify(row.progress)],
  );
  return !!r.rowCount;
}

/** Class chosen at the ceremony (classes §3, §5): the free change window starts at the first choice. */
export async function setClass(q: Queryable, id: string, cls: string): Promise<void> {
  await q.query(
    `UPDATE characters SET class = $2, class_changed_at = COALESCE(class_changed_at, now()),
       updated_at = now(), version = version + 1 WHERE id = $1`,
    [id, cls],
  );
}

/** Lock the character row for the rest of the transaction (server-design §7.2). */
export async function lockCharacter(t: Tx, id: string): Promise<CharacterRow> {
  const r = await t.query<CharacterRow>(`SELECT ${COLS} FROM characters WHERE id = $1 FOR UPDATE`, [id]);
  if (!r.rows[0]) throw new Error(`character ${id} not found`);
  return r.rows[0];
}

/** Write-behind of the soft state (server-design §8): position, HP, MP, EXP, play time. */
export async function saveCharacterState(
  q: Queryable,
  id: string,
  s: { level: number; exp: number; hp: number; mp: number; mapId: string; x: number; y: number; playSeconds: number },
): Promise<void> {
  await q.query(
    `UPDATE characters SET level = $2, exp = $3, hp = $4, mp = $5, map_id = $6, pos_x = $7, pos_y = $8,
       play_seconds = play_seconds + $9, last_online_at = now(), updated_at = now(), version = version + 1
     WHERE id = $1`,
    [
      id,
      s.level,
      s.exp,
      Math.max(0, Math.round(s.hp)),
      Math.max(0, Math.round(s.mp)),
      s.mapId,
      s.x,
      s.y,
      s.playSeconds,
    ],
  );
}

/** Level up: written at once with the potential points it grants (server-design §8: points are written at once). */
export async function saveLevelUp(
  q: Queryable,
  id: string,
  level: number,
  exp: number,
  addPoints: number,
): Promise<void> {
  await q.query(
    `UPDATE characters SET level = $2, exp = $3, stat_points = stat_points + $4, updated_at = now(), version = version + 1
     WHERE id = $1`,
    [id, level, exp, addPoints],
  );
}

export type PointSpend = { hp: number; mp: number; atk: number; def: number; crit: number };

/** Spend potential points (combat §3.3). Returns the new row, or null when there are not enough free points. */
export async function spendPoints(q: Queryable, id: string, p: PointSpend): Promise<CharacterRow | null> {
  const n = p.hp + p.mp + p.atk + p.def + p.crit;
  const r = await q.query<CharacterRow>(
    `UPDATE characters SET stat_points = stat_points - $2, pts_hp = pts_hp + $3, pts_mp = pts_mp + $4,
       pts_atk = pts_atk + $5, pts_def = pts_def + $6, pts_crit = pts_crit + $7, updated_at = now(), version = version + 1
     WHERE id = $1 AND stat_points >= $2 RETURNING ${COLS}`,
    [id, n, p.hp, p.mp, p.atk, p.def, p.crit],
  );
  return r.rows[0] ?? null;
}

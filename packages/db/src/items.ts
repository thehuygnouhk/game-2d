import type { Tx } from "./index";

/** item_instances in the bag (database-schema §4.3). Callers lock the character row first (lockCharacter). */
export interface ItemRow {
  id: string;
  template_id: string;
  qty: number;
  slot: number;
  rarity: number;
  item_level: number;
  /** BAG or EQUIP (step B4: equipment slot index in `slot`, items §3) */
  location: "BAG" | "EQUIP";
  /** affix lines [key, value] (items §2.2) */
  affixes: [string, number][];
}

export class BagFullError extends Error {
  constructor() {
    super("bag is full");
  }
}

export const ITEM_COLS = "id, template_id, qty, slot, rarity, item_level, location, affixes";

/**
 * Put items in the bag: top up existing stacks of the same item first (when `stack` is set), then use the
 * lowest free slots. Throws BagFullError (and the caller's transaction rolls back) when they do not fit.
 * Returns every row created or changed.
 */
export async function grantItem(
  t: Tx,
  characterId: string,
  g: {
    templateId: string;
    qty: number;
    stack?: number;
    rarity?: number;
    itemLevel?: number;
    affixes?: [string, number][];
    bagSize: number;
  },
): Promise<ItemRow[]> {
  const out: ItemRow[] = [];
  let left = g.qty;
  if (g.stack && g.stack > 1) {
    const stacks = await t.query<ItemRow>(
      `SELECT ${ITEM_COLS} FROM item_instances
       WHERE holder_id = $1 AND location = 'BAG' AND template_id = $2 AND qty < $3 ORDER BY slot`,
      [characterId, g.templateId, g.stack],
    );
    for (const s of stacks.rows) {
      if (left <= 0) break;
      const add = Math.min(left, g.stack - s.qty);
      const r = await t.query<ItemRow>(
        `UPDATE item_instances SET qty = qty + $2, version = version + 1, updated_at = now() WHERE id = $1 RETURNING ${ITEM_COLS}`,
        [s.id, add],
      );
      out.push(r.rows[0]!);
      left -= add;
    }
  }
  if (left <= 0) return out;
  const used = new Set(
    (
      await t.query<{ slot: number }>(
        "SELECT slot FROM item_instances WHERE holder_id = $1 AND location = 'BAG' AND slot IS NOT NULL",
        [characterId],
      )
    ).rows.map((r) => r.slot),
  );
  const per = g.stack && g.stack > 1 ? g.stack : 1;
  while (left > 0) {
    let slot = 0;
    while (used.has(slot)) slot++;
    if (slot >= g.bagSize) throw new BagFullError();
    used.add(slot);
    const qty = Math.min(left, per);
    const r = await t.query<ItemRow>(
      `INSERT INTO item_instances (template_id, qty, location, holder_id, slot, rarity, item_level, affixes)
       VALUES ($1, $2, 'BAG', $3, $4, $5, $6, $7) RETURNING ${ITEM_COLS}`,
      [g.templateId, qty, characterId, slot, g.rarity ?? 0, g.itemLevel ?? 1, JSON.stringify(g.affixes ?? [])],
    );
    out.push(r.rows[0]!);
    left -= qty;
  }
  return out;
}

/** Use up one unit of a bag item. Returns the row after (qty 0 = deleted), or null when it is not in this bag. */
export async function consumeOne(t: Tx, characterId: string, instanceId: string): Promise<ItemRow | null> {
  const r = await t.query<ItemRow>(
    `SELECT ${ITEM_COLS} FROM item_instances WHERE id = $1 AND holder_id = $2 AND location = 'BAG' FOR UPDATE`,
    [instanceId, characterId],
  );
  const it = r.rows[0];
  if (!it) return null;
  if (it.qty > 1) {
    const u = await t.query<ItemRow>(
      `UPDATE item_instances SET qty = qty - 1, version = version + 1, updated_at = now() WHERE id = $1 RETURNING ${ITEM_COLS}`,
      [instanceId],
    );
    return u.rows[0]!;
  }
  await t.query("DELETE FROM item_instances WHERE id = $1", [instanceId]);
  return { ...it, qty: 0 };
}

/** Lowest free bag slot, or BagFullError. */
async function freeBagSlot(t: Tx, characterId: string, bagSize: number): Promise<number> {
  const used = new Set(
    (
      await t.query<{ slot: number }>(
        "SELECT slot FROM item_instances WHERE holder_id = $1 AND location = 'BAG' AND slot IS NOT NULL",
        [characterId],
      )
    ).rows.map((r) => r.slot),
  );
  let slot = 0;
  while (used.has(slot)) slot++;
  if (slot >= bagSize) throw new BagFullError();
  return slot;
}

/** A bag or equipment row of this character, locked. */
export async function itemOf(t: Tx, characterId: string, instanceId: string): Promise<ItemRow | null> {
  const r = await t.query<ItemRow>(
    `SELECT ${ITEM_COLS} FROM item_instances WHERE id = $1 AND holder_id = $2 AND location IN ('BAG', 'EQUIP') FOR UPDATE`,
    [instanceId, characterId],
  );
  return r.rows[0] ?? null;
}

/**
 * Wear a bag item in equipment slot `slot` (items §3). What was worn there takes the bag slot of the new item.
 * Returns the rows after: the worn item, and the item taken off (if any).
 */
export async function equipItem(t: Tx, characterId: string, instanceId: string, slot: number): Promise<ItemRow[]> {
  const it = await itemOf(t, characterId, instanceId);
  if (!it || it.location !== "BAG") return [];
  const old = await t.query<ItemRow>(
    `SELECT ${ITEM_COLS} FROM item_instances WHERE holder_id = $1 AND location = 'EQUIP' AND slot = $2 FOR UPDATE`,
    [characterId, slot],
  );
  const out: ItemRow[] = [];
  const was = old.rows[0];
  if (was) await t.query("UPDATE item_instances SET slot = NULL WHERE id = $1", [was.id]);
  const worn = await t.query<ItemRow>(
    `UPDATE item_instances SET location = 'EQUIP', slot = $2, version = version + 1, updated_at = now()
     WHERE id = $1 RETURNING ${ITEM_COLS}`,
    [it.id, slot],
  );
  out.push(worn.rows[0]!);
  if (was) {
    const back = await t.query<ItemRow>(
      `UPDATE item_instances SET location = 'BAG', slot = $2, version = version + 1, updated_at = now()
       WHERE id = $1 RETURNING ${ITEM_COLS}`,
      [was.id, it.slot],
    );
    out.push(back.rows[0]!);
  }
  return out;
}

/** Take off what is worn in `slot` into the lowest free bag slot. BagFullError when the bag is full. */
export async function unequipItem(t: Tx, characterId: string, slot: number, bagSize: number): Promise<ItemRow | null> {
  const r = await t.query<ItemRow>(
    `SELECT ${ITEM_COLS} FROM item_instances WHERE holder_id = $1 AND location = 'EQUIP' AND slot = $2 FOR UPDATE`,
    [characterId, slot],
  );
  const it = r.rows[0];
  if (!it) return null;
  const to = await freeBagSlot(t, characterId, bagSize);
  const u = await t.query<ItemRow>(
    `UPDATE item_instances SET location = 'BAG', slot = $2, version = version + 1, updated_at = now()
     WHERE id = $1 RETURNING ${ITEM_COLS}`,
    [it.id, to],
  );
  return u.rows[0]!;
}

/** Create an item straight in an equipment slot (the Huyền Thư of the ceremony). */
export async function grantEquipped(
  t: Tx,
  characterId: string,
  g: { templateId: string; slot: number; rarity: number; itemLevel: number; bound?: boolean },
): Promise<ItemRow> {
  await t.query("DELETE FROM item_instances WHERE holder_id = $1 AND location = 'EQUIP' AND slot = $2", [
    characterId,
    g.slot,
  ]);
  const r = await t.query<ItemRow>(
    `INSERT INTO item_instances (template_id, qty, location, holder_id, slot, rarity, item_level, bound)
     VALUES ($1, 1, 'EQUIP', $2, $3, $4, $5, $6) RETURNING ${ITEM_COLS}`,
    [g.templateId, characterId, g.slot, g.rarity, g.itemLevel, g.bound ?? false],
  );
  return r.rows[0]!;
}

/** Remove `qty` units of a bag item. Returns the row after (qty 0 = deleted) or null when it does not hold that many. */
export async function takeItem(t: Tx, characterId: string, instanceId: string, qty: number): Promise<ItemRow | null> {
  const it = await itemOf(t, characterId, instanceId);
  if (!it || it.location !== "BAG" || it.qty < qty) return null;
  if (it.qty > qty) {
    const u = await t.query<ItemRow>(
      `UPDATE item_instances SET qty = qty - $2, version = version + 1, updated_at = now() WHERE id = $1 RETURNING ${ITEM_COLS}`,
      [it.id, qty],
    );
    return u.rows[0]!;
  }
  await t.query("DELETE FROM item_instances WHERE id = $1", [it.id]);
  return { ...it, qty: 0 };
}

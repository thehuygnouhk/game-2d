import type { Tx } from "./index";

/** item_instances in the bag (database-schema §4.3). Callers lock the character row first (lockCharacter). */
export interface ItemRow {
  id: string;
  template_id: string;
  qty: number;
  slot: number;
  rarity: number;
  item_level: number;
}

export class BagFullError extends Error {
  constructor() {
    super("bag is full");
  }
}

const ITEM_COLS = "id, template_id, qty, slot, rarity, item_level";

/**
 * Put items in the bag: top up existing stacks of the same item first (when `stack` is set), then use the
 * lowest free slots. Throws BagFullError (and the caller's transaction rolls back) when they do not fit.
 * Returns every row created or changed.
 */
export async function grantItem(
  t: Tx,
  characterId: string,
  g: { templateId: string; qty: number; stack?: number; rarity?: number; itemLevel?: number; bagSize: number },
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
      `INSERT INTO item_instances (template_id, qty, location, holder_id, slot, rarity, item_level)
       VALUES ($1, $2, 'BAG', $3, $4, $5, $6) RETURNING ${ITEM_COLS}`,
      [g.templateId, qty, characterId, slot, g.rarity ?? 0, g.itemLevel ?? 1],
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

import type { Tx } from "./index";

/**
 * Change a character's Quan (soft_currency) and write the ledger row in the same transaction
 * (CLAUDE.md rule 5, database-schema §4.5 and §6). The caller holds the character row lock (lockCharacter).
 * With an idemKey, a second call with the same key changes nothing and reports `duplicate`.
 */
export async function addSoft(
  t: Tx,
  characterId: string,
  delta: number,
  reason: string,
  ref?: { type: string; id: string },
  idemKey?: string,
): Promise<{ balance: number; duplicate: boolean }> {
  if (idemKey) {
    const seen = await t.query("SELECT 1 FROM currency_ledger WHERE owner_id = $1 AND idem_key = $2", [
      characterId,
      idemKey,
    ]);
    if (seen.rowCount) {
      const b = await t.query<{ soft_currency: number }>("SELECT soft_currency FROM characters WHERE id = $1", [
        characterId,
      ]);
      return { balance: b.rows[0]!.soft_currency, duplicate: true };
    }
  }
  // CHECK (soft_currency >= 0) refuses an overdraft (pg error 23514)
  const r = await t.query<{ soft_currency: number }>(
    `UPDATE characters SET soft_currency = soft_currency + $2, version = version + 1, updated_at = now()
     WHERE id = $1 RETURNING soft_currency`,
    [characterId, delta],
  );
  const balance = r.rows[0]!.soft_currency;
  await t.query(
    `INSERT INTO currency_ledger (owner_kind, owner_id, currency, delta, balance_after, reason, ref_type, ref_id, idem_key)
     VALUES ('CHARACTER', $1, 'SOFT', $2, $3, $4, $5, $6, $7)`,
    [characterId, delta, balance, reason, ref?.type ?? null, ref?.id ?? null, idemKey ?? null],
  );
  return { balance, duplicate: false };
}

/** True when this idemKey already moved money for this character (a repeated request). */
export async function ledgerHas(t: Tx, characterId: string, idemKey: string): Promise<boolean> {
  const r = await t.query("SELECT 1 FROM currency_ledger WHERE owner_id = $1 AND idem_key = $2", [
    characterId,
    idemKey,
  ]);
  return !!r.rowCount;
}

/** Integrity check (database-schema §9): the ledger sum equals the balance for every character. */
export async function ledgerMismatches(
  t: Pick<Tx, "query">,
): Promise<{ id: string; balance: number; ledger: number }[]> {
  const r = await t.query<{ id: string; balance: number; ledger: number }>(
    `SELECT c.id, c.soft_currency AS balance, COALESCE(SUM(l.delta), 0)::bigint AS ledger
     FROM characters c LEFT JOIN currency_ledger l ON l.owner_id = c.id AND l.currency = 'SOFT'
     GROUP BY c.id HAVING c.soft_currency <> COALESCE(SUM(l.delta), 0)`,
  );
  return r.rows;
}

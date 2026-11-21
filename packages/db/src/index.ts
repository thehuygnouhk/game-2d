import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

export * from "./accounts";
export * from "./characters";
export * from "./items";
export * from "./ledger";

/** Connection used by the API and the game server (docs/architecture/database-schema.md). */
export type Db = pg.Pool;
export type Tx = pg.PoolClient;
/** Anything that runs a query: the pool or a client inside a transaction. */
export type Queryable = Pick<pg.Pool, "query">;

const here = path.dirname(fileURLToPath(import.meta.url));
export const MIGRATIONS_DIR = process.env.MIGRATIONS_DIR ?? path.resolve(here, "../migrations");
export const DEFAULT_DATABASE_URL = "postgresql://htk:htk@localhost:5432/htk";

// bigint columns (money, EXP) come back as JS numbers: values stay far below 2^53 in this game
pg.types.setTypeParser(pg.types.builtins.INT8, (v) => Number(v));

export function createDb(url = process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL, max = 10): Db {
  return new pg.Pool({ connectionString: url, max });
}

/** BEGIN … COMMIT, ROLLBACK on any error. Money and items only change inside one of these (CLAUDE.md rule 5). */
export async function tx<T>(db: Db, fn: (c: Tx) => Promise<T>): Promise<T> {
  const c = await db.connect();
  try {
    await c.query("BEGIN");
    const out = await fn(c);
    await c.query("COMMIT");
    return out;
  } catch (e) {
    await c.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    c.release();
  }
}

/** Apply every migrations/*.sql not applied yet, each in its own transaction. Returns the versions applied. */
export async function migrate(db: Db, dir = MIGRATIONS_DIR): Promise<string[]> {
  await db.query(
    "CREATE TABLE IF NOT EXISTS schema_migrations (version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())",
  );
  const done = new Set(
    (await db.query<{ version: string }>("SELECT version FROM schema_migrations")).rows.map((r) => r.version),
  );
  const applied: string[] = [];
  for (const f of readdirSync(dir)
    .filter((f) => /^\d{4}_.+\.sql$/.test(f))
    .sort()) {
    const version = f.replace(/\.sql$/, "");
    if (done.has(version)) continue;
    const sql = readFileSync(path.join(dir, f), "utf8");
    await tx(db, async (c) => {
      await c.query(sql);
      await c.query("INSERT INTO schema_migrations (version) VALUES ($1)", [version]);
    });
    applied.push(version);
  }
  return applied;
}

/** Drop everything (local development and tests only). */
export async function resetSchema(db: Db): Promise<void> {
  await db.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public");
}

/** The first realm (development and playtest data, database-schema §10). */
export async function seed(db: Db, wsUrl = process.env.PUBLIC_WS_URL ?? "ws://localhost:7001"): Promise<void> {
  await db.query(
    "INSERT INTO realms (id, name, ws_url) VALUES (1, 'Suối Mơ', $1) ON CONFLICT (id) DO UPDATE SET ws_url = EXCLUDED.ws_url",
    [wsUrl],
  );
}

/** Postgres error code of a failed query (23505 unique violation, 23514 check violation …). */
export const pgCode = (e: unknown): string | undefined => (e as { code?: string })?.code;

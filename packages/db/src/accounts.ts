import type { Queryable } from "./index";

/** accounts and auth_sessions (database-schema §4.1). */
export interface AccountRow {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  status: "ACTIVE" | "SUSPENDED" | "BANNED" | "DELETED";
}

export async function createAccount(
  q: Queryable,
  a: { username: string; email: string; passwordHash: string },
): Promise<AccountRow> {
  const r = await q.query<AccountRow>(
    `INSERT INTO accounts (username, email, password_hash) VALUES ($1, $2, $3)
     RETURNING id, username, email, password_hash, status`,
    [a.username, a.email, a.passwordHash],
  );
  return r.rows[0]!;
}

/** By username or email, case-insensitive, not deleted. */
export async function findAccountByLogin(q: Queryable, login: string): Promise<AccountRow | null> {
  const r = await q.query<AccountRow>(
    `SELECT id, username, email, password_hash, status FROM accounts
     WHERE (lower(username) = lower($1) OR lower(email) = lower($1)) AND deleted_at IS NULL`,
    [login],
  );
  return r.rows[0] ?? null;
}

export async function findAccount(q: Queryable, id: string): Promise<AccountRow | null> {
  const r = await q.query<AccountRow>(
    "SELECT id, username, email, password_hash, status FROM accounts WHERE id = $1 AND deleted_at IS NULL",
    [id],
  );
  return r.rows[0] ?? null;
}

export async function touchLogin(q: Queryable, id: string): Promise<void> {
  await q.query("UPDATE accounts SET last_login_at = now(), updated_at = now() WHERE id = $1", [id]);
}

export interface SessionRow {
  id: string;
  account_id: string;
  expires_at: Date;
  revoked_at: Date | null;
}

export async function createSession(
  q: Queryable,
  s: { accountId: string; tokenHash: string; ttlMs: number; device?: string; ipHash?: string },
): Promise<string> {
  const r = await q.query<{ id: string }>(
    `INSERT INTO auth_sessions (account_id, refresh_token_hash, device, ip_hash, expires_at)
     VALUES ($1, $2, $3, $4, now() + ($5 || ' milliseconds')::interval) RETURNING id`,
    [s.accountId, s.tokenHash, s.device ?? null, s.ipHash ?? null, String(s.ttlMs)],
  );
  return r.rows[0]!.id;
}

/** A refresh token that is still valid (not revoked, not expired). */
export async function findLiveSession(q: Queryable, tokenHash: string): Promise<SessionRow | null> {
  const r = await q.query<SessionRow>(
    `SELECT id, account_id, expires_at, revoked_at FROM auth_sessions
     WHERE refresh_token_hash = $1 AND revoked_at IS NULL AND expires_at > now()`,
    [tokenHash],
  );
  return r.rows[0] ?? null;
}

export async function revokeSession(q: Queryable, id: string): Promise<boolean> {
  const r = await q.query("UPDATE auth_sessions SET revoked_at = now() WHERE id = $1 AND revoked_at IS NULL", [id]);
  return (r.rowCount ?? 0) > 0;
}

/** Was this hash ever issued (even if revoked)? A revoked token shown again means it was stolen: revoke all. */
export async function findAnySession(q: Queryable, tokenHash: string): Promise<SessionRow | null> {
  const r = await q.query<SessionRow>(
    "SELECT id, account_id, expires_at, revoked_at FROM auth_sessions WHERE refresh_token_hash = $1",
    [tokenHash],
  );
  return r.rows[0] ?? null;
}

export async function revokeAllSessions(q: Queryable, accountId: string): Promise<void> {
  await q.query("UPDATE auth_sessions SET revoked_at = now() WHERE account_id = $1 AND revoked_at IS NULL", [
    accountId,
  ]);
}

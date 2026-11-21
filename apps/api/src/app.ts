import cookie from "@fastify/cookie";
import type { Content } from "@htk/content";
import {
  createAccount,
  createCharacter,
  createSession,
  type Db,
  findAccount,
  findAccountByLogin,
  findAnySession,
  findCharacter,
  findLiveSession,
  listCharacters,
  pgCode,
  revokeAllSessions,
  revokeSession,
  touchLogin,
} from "@htk/db";
import { CharacterName, noPoints, playerStats, PROTOCOL_VERSION, RULES } from "@htk/shared";
import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from "fastify";
import type { Redis } from "ioredis";
import { z } from "zod";
import {
  ACCESS_TTL_S,
  checkPassword,
  hashPassword,
  ipHash,
  isCommonPassword,
  randomToken,
  readAccess,
  REFRESH_TTL_MS,
  sha256,
  signAccess,
  TICKET_TTL_S,
} from "./security";

export interface ApiConfig {
  /** path prefix of every route ("" or "/api") */
  prefix: string;
  jwtSecret: string;
  /** Secure flag on the refresh cookie (HTTPS) */
  cookieSecure: boolean;
  /** behind a reverse proxy: take the client IP from X-Forwarded-For */
  trustProxy: boolean;
  /** characters per account per realm */
  maxCharacters: number;
  /** multiplies every rate limit (1 in production; end-to-end tests raise it) */
  rateLimitScale?: number;
  logger: boolean;
}
export interface ApiDeps {
  db: Db;
  redis: Redis;
  content: Content;
  cfg: ApiConfig;
}

/** Ticket stored in Redis for the game server (security §3: 128-bit, 30 s, one use). */
export interface Ticket {
  accountId: string;
  characterId: string;
  realmId: number;
  ipHash: string;
}

const Username = z
  .string()
  .trim()
  .regex(/^[A-Za-z0-9_]{3,20}$/, "3-20 letters, digits or _");
const Email = z.string().trim().max(254).email();
const Password = z.string().min(8).max(128);
const RegisterBody = z.object({ username: Username, email: Email, password: Password });
const LoginBody = z.object({ login: z.string().trim().min(1).max(254), password: z.string().min(1).max(128) });
const CreateCharacterBody = z.object({
  name: CharacterName,
  gender: z.enum(["MALE", "FEMALE"]),
  origin: z.enum(["VILLAGER", "NOBLE", "ANCIENT"]),
});
const TicketBody = z.object({ realmId: z.number().int().positive(), characterId: z.string().uuid() });
const RealmParams = z.object({ id: z.coerce.number().int().positive() });

class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}
const fail = (status: number, code: string, message: string): never => {
  throw new ApiError(status, code, message);
};

/** Fixed-window counter in Redis (database-schema §7, key rl:*). */
async function within(redis: Redis, key: string, limit: number, windowS: number): Promise<boolean> {
  const n = await redis.incr(key);
  if (n === 1) await redis.expire(key, windowS);
  return n <= limit;
}

export async function buildApi({ db, redis, content, cfg }: ApiDeps): Promise<FastifyInstance> {
  const app = Fastify({ logger: cfg.logger, trustProxy: cfg.trustProxy, bodyLimit: 16 * 1024 });
  await app.register(cookie);
  const secret = new TextEncoder().encode(cfg.jwtSecret);
  const scale = cfg.rateLimitScale ?? 1;
  const limit = (key: string, n: number, windowS: number) => within(redis, key, n * scale, windowS);
  const RT = "htk_rt";
  const mapName = (id: string) => {
    const m = content.maps.get(id);
    return m ? content.text(m.nameKey) : id;
  };
  const cookiePath = `${cfg.prefix}/auth`;

  app.setErrorHandler((err, _req, reply) => {
    if (err instanceof ApiError)
      return reply.status(err.status).send({ error: { code: err.code, message: err.message } });
    if (err instanceof z.ZodError)
      return reply.status(400).send({
        error: {
          code: "INVALID",
          message: err.issues.map((i) => `${i.path.join(".") || "body"}: ${i.message}`).join("; "),
        },
      });
    const status = (err as { statusCode?: number }).statusCode;
    if (status && status < 500)
      return reply.status(status).send({ error: { code: "BAD_REQUEST", message: (err as Error).message } });
    app.log.error(err);
    return reply.status(500).send({ error: { code: "INTERNAL", message: "internal error" } });
  });

  const issue = async (reply: FastifyReply, req: FastifyRequest, accountId: string) => {
    const refresh = randomToken();
    await createSession(db, {
      accountId,
      tokenHash: sha256(refresh),
      ttlMs: REFRESH_TTL_MS,
      device: String(req.headers["user-agent"] ?? "").slice(0, 120),
      ipHash: ipHash(secret, req.ip),
    });
    reply.setCookie(RT, refresh, {
      path: cookiePath,
      httpOnly: true,
      sameSite: "lax",
      secure: cfg.cookieSecure,
      maxAge: REFRESH_TTL_MS / 1000,
    });
    const account = await findAccount(db, accountId);
    return {
      accessToken: await signAccess(secret, accountId),
      expiresIn: ACCESS_TTL_S,
      account: { id: accountId, username: account?.username },
    };
  };

  const auth = async (req: FastifyRequest): Promise<string> => {
    const h = req.headers.authorization ?? "";
    const id = h.startsWith("Bearer ") ? await readAccess(secret, h.slice(7)) : null;
    if (!id) return fail(401, "UNAUTHORIZED", "sign in again");
    const acc = await findAccount(db, id);
    if (!acc || acc.status !== "ACTIVE") return fail(403, "ACCOUNT_LOCKED", "account is not active");
    return id;
  };

  await app.register(
    async (r) => {
      r.get("/status", async () => ({ ok: true, protocolVersion: PROTOCOL_VERSION }));

      r.post("/auth/register", async (req, reply) => {
        if (!(await limit(`rl:ip:${ipHash(secret, req.ip)}:register`, 10, 3600)))
          fail(429, "RATE_LIMIT", "too many sign-ups from this network, try again later");
        const b = RegisterBody.parse(req.body);
        if (isCommonPassword(b.password)) fail(400, "WEAK_PASSWORD", "this password is too common");
        let acc;
        try {
          acc = await createAccount(db, {
            username: b.username,
            email: b.email,
            passwordHash: await hashPassword(b.password),
          });
        } catch (e) {
          if (pgCode(e) === "23505") fail(409, "TAKEN", "username or email is already used");
          throw e;
        }
        reply.status(201);
        return issue(reply, req, acc.id);
      });

      // network-protocol §10: 5 per minute per IP, 10 per hour per account; security §3: 5 failures lock 10 minutes
      r.post("/auth/login", async (req, reply) => {
        const b = LoginBody.parse(req.body);
        if (!(await limit(`rl:ip:${ipHash(secret, req.ip)}:login`, 5, 60)))
          fail(429, "RATE_LIMIT", "too many attempts, wait a minute");
        const acc = await findAccountByLogin(db, b.login);
        if (acc && !(await limit(`rl:acc:${acc.id}:login`, 10, 3600)))
          fail(429, "RATE_LIMIT", "too many attempts on this account, try again later");
        if (acc && Number(await redis.get(`lock:login:${acc.id}`)) >= 5) fail(429, "LOCKED", "locked for 10 minutes");
        if (!acc || !(await checkPassword(acc.password_hash, b.password))) {
          if (acc) await within(redis, `lock:login:${acc.id}`, 5, 600);
          fail(401, "BAD_CREDENTIALS", "wrong username or password");
        }
        if (acc!.status !== "ACTIVE") fail(403, "ACCOUNT_LOCKED", "account is not active");
        await redis.del(`lock:login:${acc!.id}`);
        await touchLogin(db, acc!.id);
        return issue(reply, req, acc!.id);
      });

      // refresh tokens rotate on every use; a reused (revoked) one revokes every session of the account
      r.post("/auth/refresh", async (req, reply) => {
        const token = req.cookies[RT];
        if (!token) return fail(401, "UNAUTHORIZED", "no session");
        const h = sha256(token);
        const live = await findLiveSession(db, h);
        if (!live) {
          const any = await findAnySession(db, h);
          if (any?.revoked_at) await revokeAllSessions(db, any.account_id);
          reply.clearCookie(RT, { path: cookiePath });
          return fail(401, "UNAUTHORIZED", "session expired");
        }
        if (!(await revokeSession(db, live.id))) return fail(401, "UNAUTHORIZED", "session expired");
        const acc = await findAccount(db, live.account_id);
        if (!acc || acc.status !== "ACTIVE") return fail(403, "ACCOUNT_LOCKED", "account is not active");
        return issue(reply, req, live.account_id);
      });

      r.post("/auth/logout", async (req, reply) => {
        const token = req.cookies[RT];
        if (token) {
          const s = await findLiveSession(db, sha256(token));
          if (s) await revokeSession(db, s.id);
        }
        reply.clearCookie(RT, { path: cookiePath });
        return reply.status(204).send();
      });

      r.get("/me", async (req) => {
        const acc = (await findAccount(db, await auth(req)))!;
        return { id: acc.id, username: acc.username, email: acc.email };
      });

      r.get("/realms", async () => {
        const rows = await db.query<{ id: number; name: string; status: string }>(
          "SELECT id, name, status FROM realms ORDER BY id",
        );
        return rows.rows;
      });

      r.get("/realms/:id/characters", async (req) => {
        const accountId = await auth(req);
        const { id } = RealmParams.parse(req.params);
        const list = await listCharacters(db, accountId, id);
        return { max: cfg.maxCharacters, characters: list.map((c) => ({ ...c, mapName: mapName(c.map_id) })) };
      });

      r.post("/realms/:id/characters", async (req, reply) => {
        const accountId = await auth(req);
        const { id: realmId } = RealmParams.parse(req.params);
        const b = CreateCharacterBody.parse(req.body);
        const realm = await db.query("SELECT 1 FROM realms WHERE id = $1", [realmId]);
        if (!realm.rowCount) fail(404, "NO_REALM", "no such realm");
        if ((await listCharacters(db, accountId, realmId)).length >= cfg.maxCharacters)
          fail(409, "TOO_MANY", `at most ${cfg.maxCharacters} characters per realm`);
        const start = playerStats(1, content.origins[b.origin], noPoints());
        // classes §2.1: Lv1, 10 potential points, 3 small HP and 3 small MP potions
        const starter = ["potion_hp", "potion_mp"].map((id) => ({
          templateId: id,
          qty: 3,
          stack: content.items.get(id)?.stack ?? 1,
        }));
        try {
          const c = await createCharacter(db, {
            accountId,
            realmId,
            name: b.name,
            gender: b.gender === "MALE" ? "M" : "F",
            origin: b.origin,
            hp: start.hp,
            mp: start.mp,
            starter,
            bagSize: RULES.bagSize,
          });
          reply.status(201);
          return {
            id: c.id,
            name: c.name,
            gender: c.gender,
            origin: c.origin,
            class: c.class,
            level: c.level,
            map_id: c.map_id,
            mapName: mapName(c.map_id),
          };
        } catch (e) {
          if (pgCode(e) === "23505") fail(409, "NAME_TAKEN", "this name is taken on this realm");
          throw e;
        }
      });

      r.post("/session/ticket", async (req) => {
        const accountId = await auth(req);
        const b = TicketBody.parse(req.body);
        if (!(await limit(`rl:acc:${accountId}:ticket`, 20, 60))) fail(429, "RATE_LIMIT", "too many tickets");
        const c = await findCharacter(db, b.characterId);
        if (!c || c.account_id !== accountId || c.realm_id !== b.realmId)
          fail(404, "NO_CHARACTER", "no such character");
        const realm = await db.query<{ ws_url: string; status: string }>(
          "SELECT ws_url, status FROM realms WHERE id = $1",
          [b.realmId],
        );
        const rr = realm.rows[0];
        if (!rr || rr.status !== "OPEN") fail(503, "REALM_CLOSED", "realm is not open");
        const ticket = randomToken(16);
        const t: Ticket = { accountId, characterId: b.characterId, realmId: b.realmId, ipHash: ipHash(secret, req.ip) };
        await redis.set(`ticket:${ticket}`, JSON.stringify(t), "EX", TICKET_TTL_S);
        return { wsUrl: rr!.ws_url, ticket, protocolVersion: PROTOCOL_VERSION };
      });
    },
    { prefix: cfg.prefix },
  );
  return app;
}

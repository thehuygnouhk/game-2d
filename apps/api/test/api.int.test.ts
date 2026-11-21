import { loadContent } from "@htk/content";
import { createDb, type Db, migrate, resetSchema, seed } from "@htk/db";
import type { FastifyInstance } from "fastify";
import { Redis } from "ioredis";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApi, type Ticket } from "../src/app";

// Integration: real PostgreSQL and Redis (pnpm test:int), requests through app.inject.
const db: Db = createDb(process.env.TEST_DATABASE_URL ?? "postgresql://htk:htk@localhost:5432/htk_test");
const redis = new Redis(process.env.TEST_REDIS_URL ?? "redis://localhost:6379/15");
let app: FastifyInstance;

beforeAll(async () => {
  await resetSchema(db);
  await migrate(db);
  await seed(db, "ws://game.test:7001");
  await redis.flushdb();
  app = await buildApi({
    db,
    redis,
    content: loadContent(),
    cfg: {
      prefix: "/api",
      jwtSecret: "t".repeat(32),
      cookieSecure: false,
      trustProxy: false,
      maxCharacters: 3,
      logger: false,
    },
  });
});
afterAll(async () => {
  await app.close();
  await db.end();
  redis.disconnect();
});

let ip = 1;
const call = (
  method: "GET" | "POST",
  url: string,
  body?: unknown,
  h: Record<string, string> = {},
  remoteAddress = "10.0.0.1",
) => app.inject({ method, url: `/api${url}`, payload: body as object, headers: h, remoteAddress });
const register = async (username: string, password = "suoi-mo-xanh") => {
  const r = await call(
    "POST",
    "/auth/register",
    { username, email: `${username}@example.test`, password },
    {},
    `10.1.0.${ip++}`,
  );
  expect(r.statusCode).toBe(201);
  const cookie = r.cookies.find((c) => c.name === "htk_rt")!;
  return { token: r.json().accessToken as string, cookie: `htk_rt=${cookie.value}`, raw: cookie };
};
const bearer = (t: string) => ({ authorization: `Bearer ${t}` });

describe("accounts (network-protocol §10, security §3)", () => {
  it("registers, refuses duplicates, weak passwords and bad names", async () => {
    const a = await register("lan_ha");
    expect(a.raw).toMatchObject({ httpOnly: true, path: "/api/auth", sameSite: "Lax" });
    const dup = await call("POST", "/auth/register", {
      username: "LAN_HA",
      email: "x@example.test",
      password: "suoi-mo-xanh",
    });
    expect(dup.statusCode).toBe(409);
    const weak = await call("POST", "/auth/register", {
      username: "minh",
      email: "m@example.test",
      password: "12345678",
    });
    expect(weak.json().error.code).toBe("WEAK_PASSWORD");
    const bad = await call("POST", "/auth/register", { username: "a b", email: "nope", password: "x" });
    expect(bad.statusCode).toBe(400);
    const me = await call("GET", "/me", undefined, bearer(a.token));
    expect(me.json()).toMatchObject({ username: "lan_ha", email: "lan_ha@example.test" });
    expect((await call("GET", "/me", undefined, bearer("nope"))).statusCode).toBe(401);
  });

  it("signs in by username or email and locks after five wrong passwords", async () => {
    await register("khoa");
    const ok = await call(
      "POST",
      "/auth/login",
      { login: "KHOA@example.test", password: "suoi-mo-xanh" },
      {},
      "10.2.0.1",
    );
    expect(ok.statusCode).toBe(200);
    for (let i = 0; i < 5; i++) {
      const r = await call("POST", "/auth/login", { login: "khoa", password: "wrong-pass" }, {}, `10.3.0.${i}`);
      expect(r.statusCode).toBe(401);
    }
    const locked = await call("POST", "/auth/login", { login: "khoa", password: "suoi-mo-xanh" }, {}, "10.3.1.1");
    expect(locked.json().error.code).toBe("LOCKED");
    // and one network cannot hammer the login: 5 per minute
    for (let i = 0; i < 5; i++)
      await call("POST", "/auth/login", { login: `nobody${i}`, password: "x" }, {}, "10.4.0.1");
    expect((await call("POST", "/auth/login", { login: "x", password: "x" }, {}, "10.4.0.1")).json().error.code).toBe(
      "RATE_LIMIT",
    );
  });

  it("rotates refresh tokens and revokes everything when an old one is reused", async () => {
    const a = await register("mai");
    const r1 = await call("POST", "/auth/refresh", undefined, { cookie: a.cookie });
    expect(r1.statusCode).toBe(200);
    const c2 = `htk_rt=${r1.cookies.find((c) => c.name === "htk_rt")!.value}`;
    expect((await call("POST", "/auth/refresh", undefined, { cookie: a.cookie })).statusCode).toBe(401); // reuse
    expect((await call("POST", "/auth/refresh", undefined, { cookie: c2 })).statusCode).toBe(401); // family revoked
    const again = await call("POST", "/auth/login", { login: "mai", password: "suoi-mo-xanh" }, {}, "10.5.0.1");
    const c3 = `htk_rt=${again.cookies.find((c) => c.name === "htk_rt")!.value}`;
    expect((await call("POST", "/auth/logout", undefined, { cookie: c3 })).statusCode).toBe(204);
    expect((await call("POST", "/auth/refresh", undefined, { cookie: c3 })).statusCode).toBe(401);
  });
});

describe("characters and game tickets", () => {
  it("creates up to three characters with unique names and the starting kit", async () => {
    const a = await register("oanh");
    expect((await call("GET", "/realms")).json()).toEqual([{ id: 1, name: "Suối Mơ", status: "OPEN" }]);
    const make = (name: string) =>
      call("POST", "/realms/1/characters", { name, gender: "FEMALE", origin: "ANCIENT" }, bearer(a.token));
    const c = await make("  Oanh   Vàng ");
    expect(c.statusCode).toBe(201);
    expect(c.json()).toMatchObject({ name: "Oanh Vàng", gender: "F", origin: "ANCIENT", level: 1, map_id: "M001" });
    expect(c.json().mapName).toBe("Nhà Học Suối Mơ");
    expect((await make("oanh vàng")).json().error.code).toBe("NAME_TAKEN");
    expect((await make("x")).statusCode).toBe(400);
    expect((await make("Oanh Hai")).statusCode).toBe(201);
    expect((await make("Oanh Ba")).statusCode).toBe(201);
    expect((await make("Oanh Bốn")).json().error.code).toBe("TOO_MANY");
    const list = (await call("GET", "/realms/1/characters", undefined, bearer(a.token))).json();
    expect(list.max).toBe(3);
    expect(list.characters.map((x: { name: string }) => x.name)).toEqual(["Oanh Vàng", "Oanh Hai", "Oanh Ba"]);
    const bag = await db.query("SELECT template_id, qty FROM item_instances WHERE holder_id = $1 ORDER BY slot", [
      c.json().id,
    ]);
    expect(bag.rows).toEqual([
      { template_id: "potion_hp", qty: 3 },
      { template_id: "potion_mp", qty: 3 },
    ]);
  });

  it("issues a 30-second one-use ticket only for one's own character", async () => {
    const a = await register("phuc");
    const b = await register("quan");
    const c = (
      await call("POST", "/realms/1/characters", { name: "Phúc", gender: "MALE", origin: "VILLAGER" }, bearer(a.token))
    ).json();
    const t = await call("POST", "/session/ticket", { realmId: 1, characterId: c.id }, bearer(a.token));
    expect(t.statusCode).toBe(200);
    const body = t.json();
    expect(body).toMatchObject({ wsUrl: "ws://game.test:7001", protocolVersion: 2 });
    expect(body.ticket).toMatch(/^[A-Za-z0-9_-]{22}$/);
    const stored = JSON.parse((await redis.get(`ticket:${body.ticket}`))!) as Ticket;
    expect(stored).toMatchObject({ characterId: c.id, realmId: 1 });
    expect(await redis.ttl(`ticket:${body.ticket}`)).toBeLessThanOrEqual(30);
    const other = await call("POST", "/session/ticket", { realmId: 1, characterId: c.id }, bearer(b.token));
    expect(other.statusCode).toBe(404);
  });
});

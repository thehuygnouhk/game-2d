import { loadContent } from "@htk/content";
import { createDb } from "@htk/db";
import { Redis } from "ioredis";
import { buildApi } from "./app";

// Local development: read the repo .env (copied from .env.example); variables already set win.
if (process.env.NODE_ENV !== "production") {
  try {
    process.loadEnvFile(new URL("../../../.env", import.meta.url));
  } catch {
    // no .env
  }
}
const env = process.env;
const jwtSecret = env.JWT_SECRET ?? "";
if (!jwtSecret || (env.NODE_ENV === "production" && (jwtSecret === "change-me" || jwtSecret.length < 32)))
  throw new Error("JWT_SECRET must be set (32+ random characters in production)");

const db = createDb(env.DATABASE_URL);
const redis = new Redis(env.REDIS_URL ?? "redis://localhost:6379");
const content = loadContent({ dir: env.CONTENT_DIR || undefined, mapDir: env.MAP_DIR || undefined });
const app = await buildApi({
  db,
  redis,
  content,
  cfg: {
    prefix: env.API_PREFIX ?? "/api",
    jwtSecret,
    cookieSecure: env.COOKIE_SECURE === "1",
    trustProxy: env.TRUST_PROXY === "1",
    maxCharacters: Number(env.MAX_CHARACTERS ?? 3),
    rateLimitScale: Number(env.RATE_LIMIT_SCALE ?? 1),
    logger: env.API_LOG !== "0",
  },
});
const port = Number(env.API_PORT ?? 3000);
await app.listen({ port, host: env.API_HOST ?? "0.0.0.0" });
for (const sig of ["SIGINT", "SIGTERM"] as const)
  process.on(sig, () => {
    void app.close().then(async () => {
      await db.end();
      redis.disconnect();
      process.exit(0);
    });
  });

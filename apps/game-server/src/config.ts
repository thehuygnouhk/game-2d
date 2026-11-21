import { DEFAULT_GAME_WS_PORT } from "@htk/shared";

export interface ServerConfig {
  port: number;
  /** packages/content (YAML records) and the map folder; defaults come from @htk/content */
  contentDir?: string;
  mapDir?: string;
  mapId: string;
  /** Accept "guest:<name>" tickets. Only for local development until accounts exist (step B3). */
  devGuest: boolean;
  /** fixed random seed (tests); unset = Math.random */
  seed?: number;
  /** override every zone capacity (tests) */
  zoneCap?: number;
  /** accounts (step B3): PostgreSQL for characters, Redis for tickets. Both unset: development guests only */
  databaseUrl?: string;
  redisUrl?: string;
  realmId: number;
  /** accept WebSocket connections only from these page origins (security §4); unset: any */
  allowedOrigins?: string[];
  log: (event: string, data?: Record<string, unknown>) => void;
}

export function configFromEnv(env = process.env): ServerConfig {
  return {
    port: Number(env.GAME_WS_PORT ?? DEFAULT_GAME_WS_PORT),
    contentDir: env.CONTENT_DIR || undefined,
    mapDir: env.MAP_DIR || undefined,
    mapId: env.START_MAP ?? "M001",
    devGuest: env.DEV_GUEST === "1",
    seed: env.GAME_SEED ? Number(env.GAME_SEED) : undefined,
    zoneCap: env.ZONE_CAP ? Number(env.ZONE_CAP) : undefined,
    databaseUrl: env.DATABASE_URL || undefined,
    redisUrl: env.REDIS_URL || undefined,
    realmId: Number(env.REALM_ID ?? 1),
    allowedOrigins: env.ALLOWED_ORIGINS ? env.ALLOWED_ORIGINS.split(",").map((o) => o.trim()) : undefined,
    log: (event, data) => console.log(JSON.stringify({ t: new Date().toISOString(), event, ...data })),
  };
}

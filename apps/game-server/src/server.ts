import { loadContent } from "@htk/content";
import { createDb, type Db, loadCharacter } from "@htk/db";
import { mulberry32, SNAPSHOT_EVERY_TICKS, TICK_MS } from "@htk/shared";
import { Redis } from "ioredis";
import { WebSocketServer } from "ws";
import type { ServerConfig } from "./config";
import { type AccountGate, Session, type Ticket } from "./net/session";
import { PgStore } from "./world/store";
import { World } from "./world/world";

export interface GameServer {
  port: number;
  world: World;
  sessions: Set<Session>;
  /** stop ticking, kick everyone, save every account, close the database */
  close(): Promise<void>;
}

/** Map host: every public map of the content, 3 zones each, ticking at 20 Hz (server-design §1). */
export async function startGameServer(cfg: ServerConfig): Promise<GameServer> {
  const warnings: string[] = [];
  const content = loadContent({ dir: cfg.contentDir, mapDir: cfg.mapDir, warnings });
  for (const w of warnings) cfg.log("content.warning", { message: w });
  let db: Db | undefined, redis: Redis | undefined, gate: AccountGate | undefined;
  if (cfg.databaseUrl && cfg.redisUrl) {
    db = createDb(cfg.databaseUrl);
    redis = new Redis(cfg.redisUrl, { maxRetriesPerRequest: 2 });
    const r = redis;
    gate = {
      realmId: cfg.realmId,
      async takeTicket(t) {
        if (!/^[A-Za-z0-9_-]{16,64}$/.test(t)) return null;
        const raw = await r.getdel(`ticket:${t}`);
        return raw ? (JSON.parse(raw) as Ticket) : null;
      },
      loadCharacter: (id) => loadCharacter(db!, id),
    };
  }
  const world = new World({
    content,
    startMap: cfg.mapId,
    rng: cfg.seed !== undefined ? mulberry32(cfg.seed) : Math.random,
    zoneCap: cfg.zoneCap,
    store: db ? new PgStore(db, cfg.log) : undefined,
    log: cfg.log,
  });
  const sessions = new Set<Session>();
  const allowed = cfg.allowedOrigins;
  const wss = new WebSocketServer({
    port: cfg.port,
    maxPayload: 16 * 1024,
    ...(allowed ? { verifyClient: (info: { origin: string }) => allowed.includes(info.origin) } : {}),
  });
  await new Promise<void>((res) => wss.once("listening", () => res()));
  wss.on("connection", (ws) => {
    const s = new Session(ws, world, cfg, gate);
    sessions.add(s);
    ws.on("close", () => sessions.delete(s));
  });

  // fixed-step scheduler with an accumulator; never more than 4 catch-up ticks per wake-up
  let last = performance.now(),
    acc = 0;
  const timer = setInterval(() => {
    const now = performance.now();
    acc = Math.min(acc + (now - last), TICK_MS * 4);
    last = now;
    while (acc >= TICK_MS) {
      try {
        world.update();
        if (world.tick % SNAPSHOT_EVERY_TICKS === 0) world.replicate();
      } catch (e) {
        cfg.log("tick.error", { message: (e as Error).message, stack: (e as Error).stack });
      }
      acc -= TICK_MS;
    }
    for (const s of sessions) if (s.idle) s.close(4000, "idle");
  }, TICK_MS / 2);

  const address = wss.address();
  const port = typeof address === "object" && address ? address.port : cfg.port;
  const maps = [...world.zones.keys()];
  cfg.log("listening", {
    port,
    start: cfg.mapId,
    maps,
    zones: maps.length * 3,
    devGuest: cfg.devGuest,
    accounts: !!gate,
  });
  return {
    port,
    world,
    sessions,
    close: async () => {
      clearInterval(timer);
      // server-design §8 graceful shutdown: tell everyone, save everything, then close
      for (const s of sessions) s.kick("SHUTDOWN", "Máy chủ đang tắt để bảo trì.");
      await world.saveAll();
      for (const c of wss.clients) c.terminate();
      await new Promise<void>((res) => wss.close(() => res()));
      await db?.end();
      redis?.disconnect();
    },
  };
}

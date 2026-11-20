import { WebSocketServer } from "ws";
import { loadContent } from "@htk/content";
import { mulberry32, SNAPSHOT_EVERY_TICKS, TICK_MS } from "@htk/shared";
import type { ServerConfig } from "./config";
import { Session } from "./net/session";
import { World } from "./world/world";

export interface GameServer {
  port: number;
  world: World;
  sessions: Set<Session>;
  close(): Promise<void>;
}

/** Map host: every public map of the content, 3 zones each, ticking at 20 Hz (server-design §1). */
export async function startGameServer(cfg: ServerConfig): Promise<GameServer> {
  const warnings: string[] = [];
  const content = loadContent({ dir: cfg.contentDir, mapDir: cfg.mapDir, warnings });
  for (const w of warnings) cfg.log("content.warning", { message: w });
  const world = new World({
    content,
    startMap: cfg.mapId,
    rng: cfg.seed !== undefined ? mulberry32(cfg.seed) : Math.random,
    zoneCap: cfg.zoneCap,
  });
  const sessions = new Set<Session>();
  const wss = new WebSocketServer({ port: cfg.port, maxPayload: 16 * 1024 });
  await new Promise<void>((res) => wss.once("listening", () => res()));
  wss.on("connection", (ws) => {
    const s = new Session(ws, world, cfg);
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
  cfg.log("listening", { port, start: cfg.mapId, maps, zones: maps.length * 3, devGuest: cfg.devGuest });
  return {
    port,
    world,
    sessions,
    close: () =>
      new Promise<void>((res) => {
        clearInterval(timer);
        for (const c of wss.clients) c.terminate();
        wss.close(() => res());
      }),
  };
}

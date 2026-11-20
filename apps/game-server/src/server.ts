import { readFileSync } from "node:fs";
import path from "node:path";
import { WebSocketServer } from "ws";
import { collisionFromTiled, SNAPSHOT_EVERY_TICKS, spawnPoint, TICK_MS, type TiledMap } from "@htk/shared";
import type { ServerConfig } from "./config";
import { Session } from "./net/session";
import { Zone } from "./world/zone";

export function loadMap(dir: string, mapId: string): TiledMap {
  return JSON.parse(readFileSync(path.join(dir, `${mapId.toLowerCase()}.tmj`), "utf8")) as TiledMap;
}

export interface GameServer {
  port: number;
  zone: Zone;
  close(): Promise<void>;
}

/** Map host for step B1: one zone of one map, ticking at 20 Hz (server-design §1). */
export async function startGameServer(cfg: ServerConfig): Promise<GameServer> {
  const tiled = loadMap(cfg.mapDir, cfg.mapId);
  const zone = new Zone(cfg.mapId, 1, collisionFromTiled(tiled), spawnPoint(tiled));
  const sessions = new Set<Session>();
  const wss = new WebSocketServer({ port: cfg.port, maxPayload: 16 * 1024 });
  await new Promise<void>((res) => wss.once("listening", () => res()));
  wss.on("connection", (ws) => {
    const s = new Session(ws, zone, cfg);
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
      zone.update();
      if (zone.tick % SNAPSHOT_EVERY_TICKS === 0) zone.replicate();
      acc -= TICK_MS;
    }
    for (const s of sessions) if (s.idle) s.close(4000, "idle");
  }, TICK_MS / 2);

  const address = wss.address();
  const port = typeof address === "object" && address ? address.port : cfg.port;
  cfg.log("listening", { port, map: cfg.mapId, devGuest: cfg.devGuest });
  return {
    port,
    zone,
    close: () =>
      new Promise<void>((res) => {
        clearInterval(timer);
        for (const c of wss.clients) c.terminate();
        wss.close(() => res());
      }),
  };
}

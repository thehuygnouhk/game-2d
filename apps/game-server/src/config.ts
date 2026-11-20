import path from "node:path";
import { fileURLToPath } from "node:url";
import { DEFAULT_GAME_WS_PORT } from "@htk/shared";

const here = path.dirname(fileURLToPath(import.meta.url));
// Step B1 shares the map files with the browser prototype; they move to packages/content in step B2.
export const DEFAULT_MAP_DIR = path.resolve(here, "../../../prototype/playable/assets/maps");

export interface ServerConfig {
  port: number;
  mapDir: string;
  mapId: string;
  /** Accept "guest:<name>" tickets. Only for local development until accounts exist (step B3). */
  devGuest: boolean;
  log: (event: string, data?: Record<string, unknown>) => void;
}

export function configFromEnv(env = process.env): ServerConfig {
  return {
    port: Number(env.GAME_WS_PORT ?? DEFAULT_GAME_WS_PORT),
    mapDir: env.MAP_DIR ?? DEFAULT_MAP_DIR,
    mapId: env.START_MAP ?? "M001",
    devGuest: env.DEV_GUEST === "1",
    log: (event, data) => console.log(JSON.stringify({ t: new Date().toISOString(), event, ...data })),
  };
}

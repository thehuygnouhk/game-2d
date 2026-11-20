import { configFromEnv } from "./config";
import { startGameServer } from "./server";

const cfg = configFromEnv();
const server = await startGameServer(cfg);
for (const sig of ["SIGINT", "SIGTERM"] as const) {
  process.on(sig, () => {
    cfg.log("shutdown", { signal: sig });
    void server.close().then(() => process.exit(0));
  });
}

import { configFromEnv } from "./config";
import { startGameServer } from "./server";

// Local development: read the repo .env (copied from .env.example). Real deployments set the environment
// themselves; variables already set are never overwritten.
if (process.env.NODE_ENV !== "production") {
  try {
    process.loadEnvFile(new URL("../../../.env", import.meta.url));
  } catch {
    // no .env: defaults apply (guest tickets stay off)
  }
}

const cfg = configFromEnv();
const server = await startGameServer(cfg);
for (const sig of ["SIGINT", "SIGTERM"] as const) {
  process.on(sig, () => {
    cfg.log("shutdown", { signal: sig });
    void server.close().then(() => process.exit(0));
  });
}

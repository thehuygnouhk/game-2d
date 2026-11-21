// pnpm db:migrate | db:seed | db:reset (developer-setup-guide §5). DATABASE_URL picks the database.
import { createDb, migrate, resetSchema, seed } from "./index";

const cmd = process.argv[2];
const db = createDb();
try {
  if (cmd === "reset") {
    if (process.env.NODE_ENV === "production") throw new Error("db:reset refuses to run with NODE_ENV=production");
    await resetSchema(db);
    console.log("schema dropped");
  }
  if (cmd === "migrate" || cmd === "reset") {
    const applied = await migrate(db);
    console.log(applied.length ? `applied ${applied.join(", ")}` : "schema is up to date");
  }
  if (cmd === "seed" || cmd === "reset") {
    await seed(db);
    console.log("seeded realm 1");
  }
  if (!["migrate", "seed", "reset"].includes(cmd ?? "")) throw new Error(`unknown command ${cmd}`);
} catch (e) {
  console.error(`db ${cmd}: ${(e as Error).message}`);
  process.exitCode = 1;
} finally {
  await db.end();
}

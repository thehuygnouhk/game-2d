import type { Page } from "@playwright/test";
import pg from "pg";

/** A fresh account, a new character, and into the world (step B3 sign-up flow). */
export async function signUpAndEnter(page: Page, name: string, gender: string, origin: string) {
  const acc = await signUpAndCreate(page, name, gender, origin);
  await enterCharacter(page, name);
  return acc;
}

/** A fresh account and a new character, left on the character list (not in the world yet). */
export async function signUpAndCreate(page: Page, name: string, gender: string, origin: string) {
  const username = `u${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const password = "suoi-mo-xanh-2026";
  await page.goto("/");
  await page.click('#auth .tabs button[data-tab="register"]');
  await page.fill("#reg-name", username);
  await page.fill("#reg-email", `${username}@example.test`);
  await page.fill("#reg-pass", password);
  await page.fill("#reg-pass2", password);
  await page.click("#register-form button");
  await page.waitForSelector("#chars:not([hidden])");
  await page.fill("#name", name);
  await page.selectOption("#gender", gender);
  await page.selectOption("#origin", origin);
  await page.click("#create-form button");
  await page.locator("#char-list li", { hasText: name }).waitFor();
  return { username, password };
}

/**
 * Write a character's progress straight into the e2e database before it enters the world (the same columns
 * the game server saves): level, class, position and main quests. For tests that start past Chapter 1.
 */
export async function seedProgress(
  name: string,
  s: { level: number; cls: "FIRE" | "WATER"; map: string; x: number; y: number; done: string[]; active?: string },
) {
  const db = new pg.Client({
    connectionString: process.env.E2E_DATABASE_URL ?? "postgresql://htk:htk@localhost:5432/htk_e2e",
  });
  await db.connect();
  try {
    const r = await db.query<{ id: string }>(
      `UPDATE characters SET level = $2, exp = 0, class = $3, map_id = $4, pos_x = $5, pos_y = $6, hp = 5000, mp = 5000,
         class_changed_at = now() - interval '2 days', stat_points = 0
       WHERE name = $1 RETURNING id`,
      [name, s.level, s.cls, s.map, s.x, s.y],
    );
    const id = r.rows[0]!.id;
    for (const q of s.done)
      await db.query(
        `INSERT INTO character_quests (character_id, quest_id, status, progress, completed_at)
         VALUES ($1, $2, 'COMPLETED', '[1]', now())`,
        [id, q],
      );
    if (s.active)
      await db.query(
        `INSERT INTO character_quests (character_id, quest_id, status, progress) VALUES ($1, $2, 'ACCEPTED', '[0, 0]')`,
        [id, s.active],
      );
  } finally {
    await db.end();
  }
}

/* ---------------- moving and talking like a player (window.__htk test handle) ---------------- */
export interface DebugView {
  map: { id: string; zone: number; name: string };
  me: { x: number; y: number; ground: boolean };
  mobs: { id: number; name: string; x: number; y: number }[];
  npcs: { id: string; x: number; mark: string }[];
}
/** run `fn` in the page with the game's test handle (window.__htk) */
export const htk = <T>(p: Page, fn: (h: never) => T) =>
  p.evaluate((src) => new Function(`return (${src})(window.__htk)`)(), fn.toString()) as Promise<T>;
export const debugView = (p: Page) => htk(p, (h: { scene: { debug: DebugView } }) => h.scene.debug);

/** walk along the floor to x, hopping over steps */
export async function walkTo(page: Page, x: number, tol = 24) {
  for (let i = 0; i < 400; i++) {
    const d = await debugView(page);
    const dx = x - d.me.x;
    if (Math.abs(dx) <= tol) break;
    const key = dx > 0 ? "ArrowRight" : "ArrowLeft";
    await page.keyboard.down(key);
    await page.waitForTimeout(Math.min(250, Math.abs(dx) * 4));
    await page.keyboard.up(key);
    if (i % 6 === 5) await page.keyboard.press("Space");
  }
  await page.waitForFunction(
    () => (window as unknown as { __htk: { scene: { debug: DebugView } } }).__htk.scene.debug.me.ground,
  );
}
/** walk to an NPC of this map and press F */
export async function talkTo(page: Page, npc: string) {
  const n = (await debugView(page)).npcs.find((x) => x.id === npc)!;
  await walkTo(page, n.x + 20, 30);
  await page.keyboard.press("f");
  await page.waitForSelector(".dlg:not([hidden])");
}

/** Click "Vào game" on a character of the list and wait for the world. */
export async function enterCharacter(page: Page, name: string) {
  const row = page.locator("#char-list li", { hasText: name });
  await row.locator("button").click();
  await page.waitForFunction(
    () => !!(window as unknown as { __htk?: { scene?: { debug?: unknown } } }).__htk?.scene?.debug,
    null,
    { timeout: 30_000 },
  );
  await page.locator("#game canvas").click();
}

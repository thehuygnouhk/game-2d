import type { Page } from "@playwright/test";

/** A fresh account, a new character, and into the world (step B3 sign-up flow). */
export async function signUpAndEnter(page: Page, name: string, gender: string, origin: string) {
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
  await enterCharacter(page, name);
  return { username, password };
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

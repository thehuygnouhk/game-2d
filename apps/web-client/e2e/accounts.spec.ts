import { type Page, expect, test } from "@playwright/test";
import { enterCharacter, signUpAndEnter } from "./helpers";

// Step B3 acceptance (docs/product/roadmap.md §8): an account, a character that keeps its points and its place
// after the page is closed, the refresh cookie signing in again, sign out and sign in.
type Htk = {
  scene: { debug: { me: { x: number; y: number }; map: { id: string } } };
  state: { stats: { statPoints: number; pts: { hp: number; atk: number; def: number }; atk: number } };
};
const htk = <T>(p: Page, fn: (h: Htk) => T) =>
  p.evaluate((src) => new Function(`return (${src})(window.__htk)`)(), fn.toString()) as Promise<T>;

test("an account keeps its character between visits", async ({ browser }, info) => {
  test.setTimeout(120_000);
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  const acc = await signUpAndEnter(page, "Ngọc Ánh", "FEMALE", "NOBLE");

  // character window: 10 free points, "Cộng gợi ý" then "Xác nhận"
  expect(await htk(page, (h) => h.state.stats.statPoints)).toBe(10);
  await page.keyboard.press("c");
  await expect(page.locator(".char-win")).toBeVisible();
  await page.click(".char-win button:has-text('Cộng gợi ý')");
  await page.screenshot({ path: info.outputPath("nhan-vat.png") });
  await page.click(".char-win button.ok");
  await expect.poll(() => htk(page, (h) => h.state.stats.statPoints)).toBe(0);
  expect(await htk(page, (h) => h.state.stats.pts)).toMatchObject({ hp: 4, atk: 4, def: 2 });
  await page.keyboard.press("Escape");

  // walk a little, then leave by closing the page
  await page.locator("#game canvas").click();
  const x0 = (await htk(page, (h) => h.scene.debug.me)).x;
  await page.keyboard.down("ArrowRight");
  await page.waitForTimeout(700);
  await page.keyboard.up("ArrowRight");
  await page.waitForTimeout(400);
  const left = await htk(page, (h) => h.scene.debug.me);
  expect(left.x - x0).toBeGreaterThan(80);
  await page.close();

  // a new page signs in from the refresh cookie and finds the character where it was
  const again = await ctx.newPage();
  await again.goto("/");
  await expect(again.locator("#chars")).toBeVisible();
  await expect(again.locator("#char-list li", { hasText: "Ngọc Ánh" })).toContainText("Lv 1");
  await enterCharacter(again, "Ngọc Ánh");
  const back = await htk(again, (h) => ({ me: h.scene.debug.me, map: h.scene.debug.map.id, st: h.state.stats }));
  expect(back.map).toBe("M001");
  expect(Math.abs(back.me.x - left.x)).toBeLessThanOrEqual(12);
  expect(back.st).toMatchObject({ statPoints: 0, pts: { hp: 4, atk: 4, def: 2 } });
  await again.screenshot({ path: info.outputPath("vao-lai.png") });

  // sign out, then sign in with the password
  await again.reload();
  await again.click("#logout");
  await expect(again.locator("#auth")).toBeVisible();
  await again.fill("#login-name", acc.username);
  await again.fill("#login-pass", "wrong-password");
  await again.click("#login-form button");
  await expect(again.locator("#auth-err")).toHaveText("Sai tên tài khoản hoặc mật khẩu.");
  await again.fill("#login-pass", acc.password);
  await again.click("#login-form button");
  await expect(again.locator("#char-list li", { hasText: "Ngọc Ánh" })).toBeVisible();
  await ctx.close();
});

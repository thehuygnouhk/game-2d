import { type Page, devices, expect, test } from "@playwright/test";
import { signUpAndEnter } from "./helpers";

// Phím ảo (ui-ux §3.2): a phone held sideways signs up, walks with the joystick, talks to Thầy with "Nói",
// accepts the first quest by tapping, and swings with "Đánh". Upright, the game asks to turn the phone.
type Htk = { scene: { debug: { me: { x: number }; npcs: { id: string; x: number }[] } } };
const debug = (p: Page) =>
  p.evaluate(() => (window as unknown as { __htk: Htk }).__htk.scene.debug) as Promise<Htk["scene"]["debug"]>;

/** hold the joystick to one side until x is reached */
async function joyTo(page: Page, x: number) {
  const box = (await page.locator(".tpad .joy").boundingBox())!;
  const cx = box.x + box.width / 2,
    cy = box.y + box.height / 2;
  for (let i = 0; i < 40; i++) {
    const dx = x - (await debug(page)).me.x;
    if (Math.abs(dx) < 30) break;
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx + Math.sign(dx) * box.width * 0.45, cy, { steps: 2 });
    await page.waitForTimeout(Math.min(400, Math.abs(dx) * 4));
    await page.mouse.up();
  }
}

test("signs in on a phone held upright: the form fits the screen", async ({ browser }, info) => {
  const ctx = await browser.newContext({ ...devices["Pixel 7"] });
  const page = await ctx.newPage();
  await page.goto("/");
  await page.click('#auth .tabs button[data-tab="register"]');
  const vp = page.viewportSize()!;
  const card = (await page.locator("#auth").boundingBox())!;
  expect(card.y).toBeGreaterThanOrEqual(0);
  expect(card.y + card.height).toBeLessThanOrEqual(vp.height);
  expect(card.x + card.width).toBeLessThanOrEqual(vp.width);
  await expect(page.locator("#register-form button")).toBeInViewport();
  await page.screenshot({ path: info.outputPath("phone-signup.png") });
  await ctx.close();
});

test("plays on a phone held sideways with the virtual controls", async ({ browser }, info) => {
  test.setTimeout(120_000);
  const phone = devices["Pixel 7"];
  const ctx = await browser.newContext({
    ...phone,
    viewport: { width: phone.viewport.height, height: phone.viewport.width },
  });
  const page = await ctx.newPage();
  await signUpAndEnter(page, "Điện Thoại", "MALE", "VILLAGER");
  await expect(page.locator(".tpad .joy")).toBeVisible();
  await expect(page.locator(".keys")).toBeHidden();
  await expect(page.locator(".hud-menu")).toContainText("Hành trang");
  await expect(page.locator(".hud-menu")).not.toContainText("(B)");
  // the stage fits the screen: nothing to scroll
  const stage = (await page.locator("#stage").boundingBox())!;
  expect(stage.height).toBeLessThanOrEqual(phone.viewport.width + 1);

  const thay = (await debug(page)).npcs.find((n) => n.id === "NPC001")!;
  await joyTo(page, thay.x + 20);
  expect(Math.abs((await debug(page)).me.x - (thay.x + 20))).toBeLessThan(60);
  await page.locator(".tpad .talk").tap();
  await expect(page.locator(".dlg")).toContainText("Sáng nay con đến sớm đấy");
  await page.screenshot({ path: info.outputPath("phone-dialog.png") });
  await page.locator(".dlg-menu button", { hasText: "Nhận nhiệm vụ" }).tap();
  await expect(page.locator(".qtrack")).toContainText("Chào Bà Mơ");
  await page.locator(".tpad .atk").dispatchEvent("pointerdown");
  await page.waitForTimeout(300);
  await page.locator(".tpad .atk").dispatchEvent("pointerup");
  await page.screenshot({ path: info.outputPath("phone-landscape.png") });

  // upright: a "turn the phone" card covers the game
  await page.setViewportSize({ width: phone.viewport.width, height: phone.viewport.height });
  await expect(page.locator(".tpad .rotate")).toBeVisible();
  await page.screenshot({ path: info.outputPath("phone-portrait.png") });
  await ctx.close();
});

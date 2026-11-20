import { type Page, expect, test } from "@playwright/test";

interface Debug {
  you: number;
  me: { x: number; y: number; ground: boolean };
  unacked: number;
  corrections: number;
  remotes: { id: number; name: string; x: number; y: number }[];
}
const debug = (p: Page) =>
  p.evaluate(() => (window as unknown as { __htk: { scene: { debug: Debug } } }).__htk.scene.debug);

async function join(page: Page, name: string, gender: string, origin: string) {
  await page.goto("/");
  await page.fill("#name", name);
  await page.selectOption("#gender", gender);
  await page.selectOption("#origin", origin);
  await page.click("#join button");
  await page.waitForFunction(
    () => !!(window as unknown as { __htk?: { scene?: { debug?: unknown } } }).__htk?.scene?.debug,
    null,
    { timeout: 30_000 },
  );
  await page.locator("#game canvas").click();
}

test("two browsers see each other walk and jump on M001", async ({ browser }, info) => {
  const a = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  const b = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  await join(a, "Lan Hà", "FEMALE", "ANCIENT");
  await join(b, "Minh", "MALE", "VILLAGER");

  await expect.poll(async () => (await debug(a)).remotes.map((r) => r.name)).toContain("Minh");
  await expect.poll(async () => (await debug(b)).remotes.map((r) => r.name)).toContain("Lan Hà");
  const startA = (await debug(a)).me;

  // Lan Hà walks right for about 1 s and jumps
  await a.keyboard.down("ArrowRight");
  await a.waitForTimeout(600);
  await a.keyboard.press("Space");
  await a.waitForTimeout(500);
  await a.keyboard.up("ArrowRight");
  await a.waitForTimeout(800);

  const endA = (await debug(a)).me;
  expect(endA.x - startA.x).toBeGreaterThan(120);
  // Minh sees Lan Hà where her own (predicted, server-confirmed) client puts her
  await expect
    .poll(
      async () => {
        const seen = (await debug(b)).remotes.find((r) => r.name === "Lan Hà");
        return seen ? Math.abs(seen.x - endA.x) : 999;
      },
      { timeout: 5_000 },
    )
    .toBeLessThanOrEqual(2);
  const dA = await debug(a);
  expect(dA.unacked).toBeLessThan(10);
  expect(dA.corrections).toBe(0); // prediction matched the server the whole time
  // drawn where the server says, on the ground (no extrapolation past the landing)
  await expect
    .poll(async () =>
      b.evaluate(() => {
        const s = (
          window as unknown as {
            __htk: { scene: { children: { list: { type: string; texture?: { key: string }; y: number }[] } } };
          }
        ).__htk.scene;
        const spr = s.children.list.find((o) => o.type === "Sprite" && o.texture?.key === "p_ancient_female_novice");
        return spr ? Math.round(spr.y + 44) : -1;
      }),
    )
    .toBe(endA.y);
  await a.screenshot({ path: info.outputPath("lan-ha.png") });
  await b.screenshot({ path: info.outputPath("minh.png") });

  // Lan Hà leaves: Minh's view drops her
  await a.close();
  await expect.poll(async () => (await debug(b)).remotes.length, { timeout: 5_000 }).toBe(0);
});

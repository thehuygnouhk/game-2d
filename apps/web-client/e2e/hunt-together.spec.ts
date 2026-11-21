import { type Page, expect, test } from "@playwright/test";
import { signUpAndEnter } from "./helpers";

// Step B2 acceptance (docs/product/roadmap.md §8): two players chat, walk through the portal to Đồng Hoa,
// one fights monsters while the other watches the same monsters, then the other changes zone.
interface Mob {
  id: number;
  name: string;
  x: number;
  y: number;
  hp: number;
}
interface Debug {
  you: number;
  map: { id: string; zone: number; name: string };
  me: { x: number; y: number; ground: boolean };
  target: number | null;
  kills: number[];
  remotes: { id: number; name: string; x: number; y: number }[];
  mobs: Mob[];
  drops: { id: number; x: number; y: number }[];
}
type Htk = {
  scene: { debug: Debug };
  state: { stats: { exp: number; hp: number; lv: number }; bag: { soft: number; items: unknown[] } };
  hud: { lines: { channel: string; text: string }[] };
};
/** run `fn` in the page with the game's test handle (window.__htk) */
const htk = <T>(p: Page, fn: (h: Htk) => T) =>
  p.evaluate((src) => new Function(`return (${src})(window.__htk)`)(), fn.toString()) as Promise<T>;
const debug = (p: Page) => htk(p, (h) => h.scene.debug);

const join = (page: Page, name: string, gender: string, origin: string) => signUpAndEnter(page, name, gender, origin);

/** walk right to the portal of M001, jumping over the steps, and press up */
async function goThroughPortal(page: Page) {
  await page.keyboard.down("ArrowRight");
  for (let i = 0; i < 400 && (await debug(page)).me.x < 1985; i++) {
    if (i % 8 === 0) await page.keyboard.press("Space");
    await page.waitForTimeout(50);
  }
  await page.keyboard.up("ArrowRight");
  await page.waitForFunction(() => (window as unknown as { __htk: Htk }).__htk.scene.debug.me.ground);
  await page.keyboard.press("ArrowUp");
  await page.waitForFunction(() => (window as unknown as { __htk: Htk }).__htk.scene.debug.map.id === "M002", null, {
    timeout: 10_000,
  });
}

async function tap(page: Page, key: string, ms: number) {
  await page.keyboard.down(key);
  await page.waitForTimeout(ms);
  await page.keyboard.up(key);
}

test("two players hunt on Đồng Hoa: map chat, portal, monsters, EXP, zones", async ({ browser }, info) => {
  test.setTimeout(180_000);
  const a = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  const b = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  await join(a, "Thu Hà", "FEMALE", "ANCIENT");
  await join(b, "Quang", "MALE", "VILLAGER");

  // map chat reaches the other player in the same zone
  await a.keyboard.press("Enter");
  await a.keyboard.type("Ra đồng đánh nấm nhé");
  await a.keyboard.press("Enter");
  await expect.poll(() => htk(b, (h) => h.hud.lines.map((l) => l.text))).toContain("Thu Hà: Ra đồng đánh nấm nhé");
  await a.locator("#game canvas").click();

  await Promise.all([goThroughPortal(a), goThroughPortal(b)]);
  expect((await debug(a)).map).toMatchObject({ id: "M002", zone: 1, name: "Đồng Hoa Suối Mơ" });
  await expect.poll(async () => (await debug(b)).remotes.map((r) => r.name)).toContain("Thu Hà");
  expect((await debug(a)).mobs.length).toBeGreaterThan(3);

  // Thu Hà fights the monsters on her floor, picking up what drops; Quang watches the same monsters
  let sawDrop = false;
  for (let i = 0; i < 1200; i++) {
    const d = await debug(a);
    const exp = await htk(a, (h) => h.state.stats.exp);
    const drop = d.drops.find((x) => Math.abs(x.y - d.me.y) < 40);
    if (drop) sawDrop = true;
    if (exp > 0 && !drop) break;
    const mob = d.mobs
      .filter((m) => Math.abs(m.y - d.me.y) < 40)
      .sort((p, q) => Math.abs(p.x - d.me.x) - Math.abs(q.x - d.me.x))[0];
    const goal = drop ?? mob;
    if (!goal) {
      await tap(a, "ArrowRight", 100);
      continue;
    }
    const dx = goal.x - d.me.x;
    if (Math.abs(dx) > (drop ? 10 : 45)) await tap(a, dx > 0 ? "ArrowRight" : "ArrowLeft", 50);
    else if (!drop) {
      await a.keyboard.press("j");
      await a.waitForTimeout(120);
    } else await a.waitForTimeout(100);
  }
  const after = await htk(a, (h) => ({
    exp: h.state.stats.exp,
    bag: h.state.bag,
    lines: h.hud.lines.map((l) => l.text),
  }));
  expect(after.exp).toBeGreaterThan(0);
  expect(after.lines.some((l) => /^Hạ Nấm Lùn Lv\d · \+\d+ EXP$/.test(l))).toBe(true);
  if (sawDrop) expect(after.bag.soft + after.bag.items.length).toBeGreaterThan(0);
  // the monster Thu Hà killed is gone from Quang's view too (died for everyone, not left behind)
  const killed = (await debug(a)).kills[0];
  expect(killed).toBeGreaterThan(0);
  await expect.poll(async () => (await debug(b)).mobs.some((m) => m.id === killed)).toBe(false);
  await a.screenshot({ path: info.outputPath("thu-ha-dong-hoa.png") });
  await b.screenshot({ path: info.outputPath("quang-dong-hoa.png") });

  // Quang moves to Khu 2 through the zone list: the two no longer see each other
  await b.click(".hud-zone");
  await b.click(".hud-zones button:nth-child(2)");
  await expect.poll(async () => (await debug(b)).map.zone).toBe(2);
  await expect.poll(async () => (await debug(a)).remotes.map((r) => r.name)).not.toContain("Quang");
  expect((await debug(b)).mobs.length).toBeGreaterThan(0);
  await b.screenshot({ path: info.outputPath("quang-khu-2.png") });
  await a.context().close();
  await b.context().close();
});

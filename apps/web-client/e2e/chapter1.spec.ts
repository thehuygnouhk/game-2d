import { type Page, expect, test } from "@playwright/test";
import { signUpAndEnter } from "./helpers";

// Step B4 acceptance (docs/product/roadmap.md §8): Chapter 1 online in a real browser. Talk to Thầy Bạch Vân
// and Bà Mơ (Q_MAIN_01), buy at Lam Nhi's shop, hunt Nấm Lùn for Q_MAIN_02 and wear the Kiếm Gỗ Tập.
interface Debug {
  map: { id: string };
  me: { x: number; y: number; ground: boolean };
  mobs: { id: number; name: string; x: number; y: number }[];
  drops: { id: number; x: number; y: number }[];
  npcs: { id: string; x: number; mark: string }[];
  kills: number[];
}
type Htk = {
  scene: { debug: Debug };
  state: {
    stats: { atk: number };
    bag: { soft: number; items: { item: string; qty: number }[] };
    equipment: Record<string, { item: string } | undefined>;
    quests: { main: { id: string; status: string; objectives: { got: number }[] } | null; done: number };
  };
};
const htk = <T>(p: Page, fn: (h: Htk) => T) =>
  p.evaluate((src) => new Function(`return (${src})(window.__htk)`)(), fn.toString()) as Promise<T>;
const debug = (p: Page) => htk(p, (h) => h.scene.debug);

/** walk along the floor to x, hopping over steps */
async function walkTo(page: Page, x: number, tol = 24) {
  for (let i = 0; i < 300; i++) {
    const d = await debug(page);
    const dx = x - d.me.x;
    if (Math.abs(dx) <= tol) break;
    const key = dx > 0 ? "ArrowRight" : "ArrowLeft";
    await page.keyboard.down(key);
    await page.waitForTimeout(Math.min(250, Math.abs(dx) * 4));
    await page.keyboard.up(key);
    if (i % 6 === 5) await page.keyboard.press("Space");
  }
  await page.waitForFunction(() => (window as unknown as { __htk: Htk }).__htk.scene.debug.me.ground);
}
async function talkTo(page: Page, npc: string) {
  const n = (await debug(page)).npcs.find((x) => x.id === npc)!;
  await walkTo(page, n.x + 20, 30);
  await page.keyboard.press("f");
  await page.waitForSelector(".dlg:not([hidden])");
}
/** pick the dialog choice whose label contains `text` */
async function choose(page: Page, text: string) {
  await page.locator(".dlg-menu button", { hasText: text }).click();
}

test("Chapter 1 online: NPC dialog, quests, Lam Nhi's shop, wearing the quest sword", async ({ browser }, info) => {
  test.setTimeout(240_000);
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  await signUpAndEnter(page, "Hạ Vy", "FEMALE", "VILLAGER");
  await expect(page.locator(".qtrack")).toContainText("Gặp Thầy Bạch Vân để nhận");
  expect((await debug(page)).npcs.find((n) => n.id === "NPC001")?.mark).toBe("!");

  // Q_MAIN_01: Thầy → Bà Mơ → Thầy
  await talkTo(page, "NPC001");
  await expect(page.locator(".dlg")).toContainText("Sáng nay con đến sớm đấy");
  await page.screenshot({ path: info.outputPath("thay-bach-van.png") });
  await page.keyboard.press("1");
  await expect(page.locator(".qtrack")).toContainText("Chào Bà Mơ");
  await page.keyboard.press("Escape");
  await talkTo(page, "NPC002");
  await expect(page.locator(".dlg")).toContainText("Cầm cái bánh này");
  await page.keyboard.press("Escape");
  await expect(page.locator(".qtrack")).toContainText("Về gặp Thầy Bạch Vân");
  await talkTo(page, "NPC001");
  await choose(page, "Trả nhiệm vụ");
  await expect.poll(() => htk(page, (h) => h.state.quests.done)).toBe(1);
  await expect(page.locator(".dlg")).toContainText("Ăn sáng no rồi mới học được");
  expect(await htk(page, (h) => h.state.bag.soft)).toBe(100);
  await page.keyboard.press("Escape");

  // Lam Nhi's shop: buy two small HP potions for 40 Quan
  await talkTo(page, "NPC003");
  await choose(page, "Mua bán");
  await page.waitForSelector(".bagwin:not([hidden]) .bw-shop");
  await page.locator(".srow", { hasText: "Bình HP Nhỏ" }).locator("button", { hasText: "Mua 1" }).click();
  await page.locator(".srow", { hasText: "Bình HP Nhỏ" }).locator("button", { hasText: "Mua 1" }).click();
  await expect.poll(() => htk(page, (h) => h.state.bag.soft)).toBe(60);
  await page.screenshot({ path: info.outputPath("tiem-lam-nhi.png") });
  await page.keyboard.press("Escape");

  // Q_MAIN_02: five Nấm Lùn on Đồng Hoa
  await talkTo(page, "NPC001");
  await choose(page, "Nhận nhiệm vụ");
  await page.keyboard.press("Escape");
  await walkTo(page, 1990, 10);
  await page.keyboard.press("ArrowUp");
  await page.waitForFunction(() => (window as unknown as { __htk: Htk }).__htk.scene.debug.map.id === "M002", null, {
    timeout: 10_000,
  });
  for (let i = 0; i < 2500; i++) {
    const q = await htk(page, (h) => h.state.quests.main);
    if (q?.status === "READY") break;
    const d = await debug(page);
    const mob = d.mobs
      .filter((m) => m.name === "Nấm Lùn" && Math.abs(m.y - d.me.y) < 40)
      .sort((a, b) => Math.abs(a.x - d.me.x) - Math.abs(b.x - d.me.x))[0];
    if (!mob) {
      await walkTo(page, 330, 40);
      await page.waitForTimeout(300);
      continue;
    }
    const dx = mob.x - d.me.x;
    if (Math.abs(dx) > 45) {
      await page.keyboard.down(dx > 0 ? "ArrowRight" : "ArrowLeft");
      await page.waitForTimeout(50);
      await page.keyboard.up(dx > 0 ? "ArrowRight" : "ArrowLeft");
    } else {
      await page.keyboard.press("j");
      await page.waitForTimeout(120);
    }
  }
  await expect(page.locator(".qtrack")).toContainText("Về gặp Thầy Bạch Vân");
  await walkTo(page, 60, 20);
  await page.keyboard.press("ArrowUp");
  await page.waitForFunction(() => (window as unknown as { __htk: Htk }).__htk.scene.debug.map.id === "M001", null, {
    timeout: 10_000,
  });
  await talkTo(page, "NPC001");
  await choose(page, "Trả nhiệm vụ");
  await expect.poll(() => htk(page, (h) => h.state.bag.items.some((i) => i.item === "kiem_go_tap"))).toBe(true);
  await page.keyboard.press("Escape");

  // wear the Kiếm Gỗ Tập from the bag (double click): ATK +14 (items §4)
  const atk = await htk(page, (h) => h.state.stats.atk);
  await page.keyboard.press("b");
  await page.waitForSelector(".bagwin:not([hidden])");
  await page.locator('.bw-grid [data-item="kiem_go_tap"]').dblclick();
  await expect.poll(() => htk(page, (h) => h.state.equipment.weapon?.item)).toBe("kiem_go_tap");
  await expect.poll(() => htk(page, (h) => h.state.stats.atk)).toBe(atk + 14);
  await page.screenshot({ path: info.outputPath("hanh-trang.png") });
  await page.keyboard.press("Escape");
  expect(await htk(page, (h) => h.state.quests.main?.id)).toBe("Q_MAIN_03");
});

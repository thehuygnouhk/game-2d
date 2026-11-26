import { type Page, expect, test } from "@playwright/test";
import { debugView, enterCharacter, htk, seedProgress, signUpAndCreate, talkTo, walkTo } from "./helpers";

// Step B5.1 acceptance (docs/product/roadmap.md §8.4): Chapter 2 starts online. A Hỏa Kiếm Sĩ who finished
// Chapter 1 and read Thầy's letter (Q_MAIN_13) arrives in Thượng Đô: Lam Nhi has her stall there, Viện Chủ
// Vân Tước waits on the plaza, the gate between the banners leads to Tổng Đường Pháp Vệ where the examiner
// registers the player (Q_MAIN_14), and the road on the right goes down to the boars of Đồng Lúa Lục Nguyên.
type Quests = { main: { id: string; status: string; objectives: { got: number }[] } | null };
const quests = (p: Page) => htk(p, (h: { state: { quests: Quests } }) => h.state.quests);

/** stand in a portal and press up, like a player (maps §3) */
async function usePortal(page: Page, x: number, to: string) {
  await walkTo(page, x, 16);
  await page.keyboard.press("ArrowUp");
  await page.waitForFunction(
    (id) =>
      (window as unknown as { __htk: { scene: { debug: { map: { id: string } } } } }).__htk.scene.debug.map.id === id,
    to,
    { timeout: 10_000 },
  );
}
const portalX = (tile: number) => tile * 32 + 16;

test("Chapter 2 online: Thượng Đô, Viện Chủ Vân Tước, the examiner, Đồng Lúa Lục Nguyên", async ({ browser }, info) => {
  test.setTimeout(180_000);
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  await signUpAndCreate(page, "Thanh Tâm", "FEMALE", "NOBLE");
  const chapter1 = Array.from({ length: 13 }, (_, i) => `Q_MAIN_${String(i + 1).padStart(2, "0")}`);
  await seedProgress("Thanh Tâm", {
    level: 10,
    cls: "FIRE",
    map: "M005",
    x: portalX(4),
    y: 15 * 32,
    done: chapter1,
    active: "Q_MAIN_14",
  });
  await enterCharacter(page, "Thanh Tâm");

  // Thượng Đô: Lam Nhi's stall and Viện Chủ Vân Tước
  const npcIds = async () => (await debugView(page)).npcs.map((n) => n.id);
  expect((await debugView(page)).map).toMatchObject({ id: "M005", name: "Thượng Đô" });
  await expect.poll(npcIds).toEqual(["NPC003", "NPC011"]);
  await expect(page.locator(".qtrack")).toContainText("Gặp Viện Chủ Vân Tước");
  await page.screenshot({ path: info.outputPath("thuong-do.png") });
  await talkTo(page, "NPC011");
  await expect(page.locator(".dlg")).toContainText("Học trò của Bạch Vân");
  await page.keyboard.press("Escape");
  await expect.poll(async () => (await quests(page)).main?.objectives.map((o) => o.got)).toEqual([1, 0]);

  // the gate between the two banner poles: Tổng Đường Pháp Vệ
  await usePortal(page, portalX(26), "M008");
  await expect.poll(npcIds).toEqual(["NPC046", "NPC005"]);
  await talkTo(page, "NPC046");
  await page.locator(".dlg-menu button", { hasText: "Trả nhiệm vụ" }).click();
  await expect.poll(async () => (await quests(page)).main?.id).toBe("Q_MAIN_15");
  await expect(page.locator(".dlg")).toContainText("ghi danh xong");
  await page.screenshot({ path: info.outputPath("tong-duong-phap-ve.png") });
  await page.keyboard.press("Escape");
  await expect(page.locator(".qtrack")).toContainText("Đạt Lv 11 để nhận");

  // back to the plaza and down the road to the rice fields: Khôi and the boars
  await usePortal(page, portalX(1), "M005");
  await usePortal(page, portalX(78), "M009");
  expect((await debugView(page)).map.name).toBe("Đồng Lúa Lục Nguyên");
  await expect.poll(npcIds).toEqual(["NPC004"]);
  await expect.poll(async () => (await debugView(page)).mobs.some((m) => m.name === "Lợn Rừng Đồng")).toBe(true);
  await page.screenshot({ path: info.outputPath("dong-lua.png") });
});

import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { CONTENT_DIR, ContentError, flattenI18n, loadContent, RECORD_FOLDERS } from "../src";

const tmp = mkdtempSync(path.join(tmpdir(), "htk-content-"));
afterAll(() => rmSync(tmp, { recursive: true, force: true }));

describe("content package", () => {
  it("loads the Chapter 1 records the online game needs", () => {
    const c = loadContent();
    expect(c.monsters.get("MOB004")?.ai).toMatchObject({ attackRange: 190, aggroRange: 240 });
    expect(c.monsters.get("MOB006")?.ai.flying).toBe(true);
    expect(c.skills.get("SKL_MANA_BURST")).toMatchObject({ unlockLevel: 5, mp: 6, atkMult: 1.2, set: "NOVICE" });
    expect(c.origins.NOBLE.base).toEqual([180, 120, 24, 7]);
    expect(c.drops.get("DROP_R01_BASIC")?.gear.items).toHaveLength(4);
    const m2 = c.maps.get("M002")!;
    expect(m2.type).toBe("FIELD");
    expect(m2.mobSpawns.map((s) => s.mob)).toContain("MOB001");
    expect(m2.portals.find((p) => p.id === "P01")).toMatchObject({ to: "M001", w: 64, h: 96 });
    expect(c.text("mob.mob001.name")).toBe("Nấm Lùn");
    expect(c.text("map.m004.name")).toBe("Hang Giếng Cạn");
  });

  it("loads the Chapter 1 story records of step B4", () => {
    const c = loadContent();
    expect(c.mainQuests.filter((q) => q.chapter === 1).map((q) => q.id)).toEqual(
      Array.from({ length: 12 }, (_, i) => `Q_MAIN_${String(i + 1).padStart(2, "0")}`),
    );
    expect(c.quests.get("Q_MAIN_03")?.objectives[1]).toEqual({
      type: "COLLECT",
      target: "cu_cai_non",
      count: 4,
      map: "M002",
    });
    expect(c.questItems.thao_duoc).toMatchObject({ node: "M002", respawnSec: 20 });
    expect(c.text(c.npcs.get("NPC003")!.nameKey)).toBe("Lam Nhi");
    expect(c.shops.get("NPC003")?.sells).toContain("potion_hp");
    expect(c.bosses.get("BOSS001")?.skillDefs.BSKL_TEAR_APART).toMatchObject({ atHp: 0.5, count: 4, pieceHp: 0.125 });
    expect(c.events.find((e) => e.id === "EVT_BOSS_034")?.maps).toEqual(["M002"]);
    expect(c.dungeons.get("DG01")).toMatchObject({ minLevel: 9, timeLimitMin: 30, boss: "BOSS001" });
    expect(c.scenes.get("Q_MAIN_11")?.lines).toHaveLength(6);
    expect(c.classes.get("FIRE")?.weapon).toBe("kiem_lua_tap_su");
    expect(c.text("dialog.level", { lv: 5, title: "X" })).toBe("Đạt Lv 5 rồi quay lại nhận “X”.");
  });

  it("loads the Chapter 2 records of step B5.1", () => {
    const c = loadContent();
    expect(c.mainQuests.filter((q) => q.chapter === 2).map((q) => q.id)).toEqual([
      "Q_MAIN_13",
      "Q_MAIN_14",
      "Q_MAIN_15",
      "Q_MAIN_16",
    ]);
    expect(c.quests.get("Q_MAIN_13")).toMatchObject({ giver: "NPC002", prerequisites: ["Q_MAIN_12"] });
    expect(c.quests.get("Q_MAIN_14")?.objectives.map((o) => [o.type, o.target, o.map])).toEqual([
      ["TALK", "NPC011", "M005"],
      ["TALK", "NPC046", "M008"],
    ]);
    expect(c.questItems.trang_sach).toEqual({ mob: "MOB009", chance: 0.5 });
    expect(c.scenes.get("Q_MAIN_13")?.lines).toHaveLength(6);
    // maps: the friends move to Thượng Đô after Q_MAIN_13, the R03 fields revive in Thượng Đô
    const npc = (map: string, id: string) => c.maps.get(map)!.npcs.find((n) => n.id === id);
    expect(npc("M001", "NPC001")?.hideAfter).toBe("Q_MAIN_12");
    expect(npc("M001", "NPC003")?.hideAfter).toBe("Q_MAIN_13");
    expect(npc("M005", "NPC003")?.showAfter).toBe("Q_MAIN_13");
    expect(c.maps.get("M009")).toMatchObject({ type: "FIELD", region: "R03", town: "M005" });
    expect(c.maps.get("M009")!.bossSpawns).toEqual([expect.objectContaining({ boss: "BOSS002", respawnMin: 3 })]);
    expect(c.maps.get("M004")!.portals.find((p) => p.to === "M005")).toBeTruthy();
    // monsters: charge, pack call, field boss
    expect(c.monsters.get("MOB008")?.ai.charge).toEqual({ speed: 300, dist: 110 });
    expect(c.monsters.get("MOB009")?.ai).toMatchObject({ type: "PACK", callRange: 220 });
    expect(c.bosses.get("BOSS002")).toMatchObject({ kind: "MINIBOSS", drops: "DROP_R03_BOSS" });
    expect(c.drops.get("DROP_R03_BASIC")?.gear).toMatchObject({ levelBand: [10, 19] });
    expect(c.items.get("s2_weapon")).toMatchObject({ set: "S2", slot: "weapon" });
    expect(c.text(c.npcs.get("NPC046")!.nameKey)).toBe("Giám Khảo Tuyển Thư");
    expect(c.text("npc.npc003.line_m005")).toContain("Thượng Đô");
  });

  it("flattens nested i18n keys", () => {
    expect(flattenI18n({ item: { "potion_hp.name": "Bình" }, q: { o: ["a"] } })).toEqual(
      new Map([
        ["item.potion_hp.name", "Bình"],
        ["q.o.0", "a"],
      ]),
    );
  });

  it("reports broken references and missing text (V003, V004)", () => {
    const dir = path.join(tmp, "content");
    for (const f of [...RECORD_FOLDERS, "i18n"])
      cpSync(path.join(CONTENT_DIR, f), path.join(dir, f), { recursive: true });
    const mob = path.join(dir, "monsters", "mob001.yaml");
    writeFileSync(
      mob,
      readFileSync(mob, "utf8").replace("drops: DROP_R01_BASIC", "drops: DROP_NOWHERE").replace("mob.mob001", "mob.x"),
    );
    try {
      loadContent({ dir });
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(ContentError);
      const p = (e as ContentError).problems.join("\n");
      expect(p).toContain("V003 monster MOB001: drop table DROP_NOWHERE does not exist");
      expect(p).toContain('V004 monsters/mob001.yaml: nameKey "mob.x.name"');
    }
  });
});

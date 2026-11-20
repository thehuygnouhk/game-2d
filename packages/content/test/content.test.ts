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

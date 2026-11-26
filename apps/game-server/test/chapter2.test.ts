import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  Op,
  type SChatMsg,
  type SEnterWorld,
  type SInventoryDelta,
  type SMapChange,
  type SNpcDialog,
  type SQuestUpdate,
  type SScene,
} from "@htk/shared";
import { gainExp, hitMob } from "../src/world/combat";
import type { Mob, Player } from "../src/world/entities";
import { tickMob } from "../src/world/mob-ai";
import { type GameServer, startGameServer } from "../src/server";
import { Client } from "./helpers/client";

// Step B5.1 (docs/product/roadmap.md §8.4): the start of Chapter 2 online, played through the protocol.
let server: GameServer;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

beforeAll(async () => {
  server = await startGameServer({ port: 0, mapId: "M001", devGuest: true, seed: 12, realmId: 1, log: () => {} });
  server.world.clock = () => Date.UTC(2026, 10, 26, 2, 0);
  server.world.rng = () => 0.1; // hits land, quest items drop, normal tier
});
afterAll(async () => {
  await server.close();
});

const playerOf = (id: number): Player => {
  for (const s of server.sessions) if (s.entity?.id === id) return s.entity;
  throw new Error(`no player ${id}`);
};

class Hero {
  constructor(
    readonly c: Client,
    readonly p: Player,
  ) {}
  get w() {
    return server.world;
  }
  /** teleport through the real map change path, then wait for it */
  async goto(map: string, x: number, zoneNo = 1, y?: number): Promise<SMapChange> {
    const zone = this.w.zone(map, zoneNo)!;
    const wait = this.c.next<SMapChange>(Op.S_MAP_CHANGE, (m) => m.map.id === map);
    // feet on the ground under the spawn height (caves have a ceiling at the top)
    this.w.transfer(this.p, zone, x, y ?? zone.surfaceBelow(x, zone.map.spawn.y - 200) ?? zone.map.spawn.y);
    return wait;
  }
  /** walk into a portal and use it like the client does */
  async portal(map: string, to: string): Promise<SMapChange> {
    const g = this.w.content.maps.get(map)!.portals.find((x) => x.to === to)!;
    await this.goto(map, g.x + g.w / 2, 1, g.y + g.h);
    const wait = this.c.next<SMapChange>(Op.S_MAP_CHANGE, (m) => m.map.id === to);
    this.c.send(Op.C_USE_PORTAL, { portalId: g.id, seq: 0 });
    return wait;
  }
  async toNpc(id: string, map: string) {
    const n = this.w.content.maps.get(map)!.npcs.find((x) => x.id === id)!;
    return this.goto(map, n.x + 20);
  }
  async talk(npcId: string): Promise<SNpcDialog> {
    const wait = this.c.next<SNpcDialog>(Op.S_NPC_DIALOG, (d) => d.npcId === npcId);
    this.c.send(Op.C_NPC_INTERACT, { npcId });
    return wait;
  }
  choose(npcId: string, optionId: string) {
    this.c.send(Op.C_NPC_CHOICE, { npcId, optionId });
  }
  async accept(npcId: string, map: string) {
    await this.toNpc(npcId, map);
    const d = await this.talk(npcId);
    expect(d.options.map((o) => o.id)).toContain("ACCEPT");
    const up = this.c.next<SQuestUpdate>(Op.S_QUEST_UPDATE, (u) => u.event?.kind === "accepted");
    this.choose(npcId, "ACCEPT");
    return (await up).main!;
  }
  async turnIn(npcId: string, map: string) {
    await this.toNpc(npcId, map);
    const d = await this.talk(npcId);
    expect(d.options.map((o) => o.id)).toContain("TURNIN");
    const delta = this.c.next<SInventoryDelta>(Op.S_INVENTORY_DELTA);
    const up = this.c.next<SQuestUpdate>(Op.S_QUEST_UPDATE, (u) => u.event?.kind === "completed");
    this.choose(npcId, "TURNIN");
    return { delta: await delta, update: await up };
  }
  /** bring down n monsters of a kind with real server hits (left on 1 HP first) */
  async kill(mobId: string, map: string, n: number) {
    for (let i = 0; i < n; i++) {
      let m: Mob | undefined;
      for (let t = 0; t < 100 && !m; t++) {
        if (this.p.zone?.mapId !== map) await this.goto(map, 200);
        m = [...this.p.zone!.mobs.values()].find((x) => x.def.id === mobId && x.alive && !x.boss);
        if (!m && t % 3 === 2)
          await this.goto(map, 200, (this.p.zone!.zoneNo % 3) + 1); // try the next zone
        else if (!m) await sleep(100);
      }
      if (!m) throw new Error(`no ${mobId} on ${map}`);
      m.hp = 1;
      hitMob(this.p.zone!, this.p, m, 1, this.w.now);
      expect(m.alive).toBe(false);
    }
  }
  quest(): SQuestUpdate {
    return server.world.quests.update(this.p);
  }
}

async function newHero(name: string): Promise<{ h: Hero; enter: SEnterWorld }> {
  const c = await Client.open(server.port);
  const enter = await c.join(name, "VILLAGER");
  return { h: new Hero(c, playerOf(enter.you)), enter };
}

/** A character who finished Chapter 1 as a Hỏa Kiếm Sĩ (step B4), standing in the village at Lv10. */
function afterChapter1(p: Player) {
  for (let i = 1; i <= 12; i++)
    p.quests.set(`Q_MAIN_${String(i).padStart(2, "0")}`, {
      quest_id: `Q_MAIN_${String(i).padStart(2, "0")}`,
      status: "COMPLETED",
      progress: [1],
    });
  p.lv = 10;
  p.exp = 0;
  p.cls = "FIRE";
  p.recompute(true);
}

describe("Chapter 2 online (step B5.1)", () => {
  it("plays Q_MAIN_13 to Q_MAIN_16: the letter, Thượng Đô, Mùa Tuyển Thư round 1, Lợn Rừng Chúa", async () => {
    const { h } = await newHero("Minh Khang");
    const { c, p } = h;
    afterChapter1(p);
    expect(h.quest()).toMatchObject({ chapter: 2, chapterName: "Chương 2: Thượng Đô", done: 0, total: 4 });
    expect((await h.goto("M001", 300)).npcs.map((n) => n.id)).toEqual(["NPC002", "NPC040", "NPC003", "NPC004"]);

    // Q_MAIN_13: the scene is the quest; closed early, Bà Mơ tells it again
    await h.toNpc("NPC002", "M001");
    expect((await h.talk("NPC002")).options.map((o) => o.id)).toContain("ACCEPT");
    const scene = c.next<SScene>(Op.S_SCENE, (s) => s.key === "Q_MAIN_13");
    h.choose("NPC002", "ACCEPT");
    const sc = await scene;
    expect(sc).toMatchObject({ report: true });
    expect(sc.lines.map((l) => l.who)).toEqual(["NPC002", "NPC003", "NPC002", "NPC004", "PLAYER", "NPC002"]);
    expect(sc.lines[4]!.name).toBe("Minh Khang");
    const again = await h.talk("NPC002");
    expect(again.options.map((o) => o.id)).toContain("SCENE");
    const replay = c.next<SScene>(Op.S_SCENE, (s) => s.key === "Q_MAIN_13" && !!s.report);
    h.choose("NPC002", "SCENE");
    await replay;
    const done13 = c.next<SQuestUpdate>(Op.S_QUEST_UPDATE, (u) => u.event?.kind === "completed");
    h.choose("NPC001", "SCENE_DONE");
    expect((await done13).main).toMatchObject({ id: "Q_MAIN_14", status: "AVAILABLE" });
    expect(p.quests.get("Q_MAIN_13")?.status).toBe("COMPLETED");

    // Lam Nhi and Khôi have left the village with the player
    expect((await h.goto("M001", 300)).npcs.map((n) => n.id)).toEqual(["NPC002", "NPC040"]);
    expect((await h.goto("M002", 300)).npcs).toEqual([]);

    // Q_MAIN_14: up to Thượng Đô through the end of Hang Giếng Cạn, Vân Tước, then the examiner
    const q14 = await h.accept("NPC002", "M001");
    expect(q14.objectives.map((o) => [o.target, o.where])).toEqual([
      ["NPC011", "Thượng Đô · trên quảng trường"],
      ["NPC046", "Tổng Đường Pháp Vệ · cổng giữa hai cột cờ ở Thượng Đô"],
    ]);
    const capital = await h.portal("M004", "M005");
    expect(capital.map.name).toBe("Thượng Đô");
    expect(capital.npcs.map((n) => n.id)).toEqual(["NPC003", "NPC011"]);
    await h.toNpc("NPC003", "M005");
    const lamNhi = await h.talk("NPC003");
    expect(lamNhi.text).toContain("Thượng Đô cái gì cũng đắt");
    expect(lamNhi.options.map((o) => o.id)).toContain("SHOP");
    await h.toNpc("NPC011", "M005");
    expect((await h.talk("NPC011")).text).toContain("Học trò của Bạch Vân");
    expect(h.quest().main?.objectives.map((o) => o.got)).toEqual([1, 0]);
    const hall = await h.portal("M005", "M008");
    expect(hall.npcs.map((n) => n.id)).toEqual(["NPC046", "NPC005"]);
    const r14 = await h.turnIn("NPC046", "M008");
    expect(r14.update.main).toMatchObject({ id: "Q_MAIN_15", status: "LOCKED" });
    expect(p.bag.items.find((i) => i.item === "potion_hp_m")?.qty).toBeGreaterThanOrEqual(5);

    // Q_MAIN_15 waits for Lv11, then boars and the pages the bandits stole
    await h.toNpc("NPC046", "M008");
    expect((await h.talk("NPC046")).text).toContain("Đạt Lv 11");
    gainExp(p, 20_000, h.w.now);
    expect(p.lv).toBeGreaterThanOrEqual(11);
    await h.accept("NPC046", "M008");
    await h.kill("MOB008", "M009", 15);
    await h.kill("MOB009", "M009", 10);
    expect(h.quest().main?.objectives.map((o) => o.got)).toEqual([15, 10]);
    const r15 = await h.turnIn("NPC046", "M008");
    expect(r15.delta.soft).toBe(300 + 400 + 600); // the bag total after Q_MAIN_13, 14 and 15
    expect(p.bag.items.find((i) => i.item === "mu_thi_sinh")).toMatchObject({ level: 12, rarity: "good" });

    // Q_MAIN_16: the boar king stands on the dike of every zone of Đồng Lúa
    gainExp(p, 20_000, h.w.now);
    expect(p.lv).toBeGreaterThanOrEqual(12);
    const q16 = await h.accept("NPC046", "M008");
    expect(q16.objectives[0]).toMatchObject({ type: "BOSS", target: "BOSS002", map: "M009" });
    expect(q16.objectives[0]!.x).toBe(h.w.content.maps.get("M009")!.bossSpawns[0]!.x);
    await h.goto("M009", q16.objectives[0]!.x! - 60);
    const z = p.zone!;
    const boss = z.fieldBoss("BOSS002")!;
    expect(boss).toBeTruthy();
    expect(boss.boss).toMatchObject({ kind: "FIELD" });
    expect(boss.max.hp).toBeGreaterThan(9000); // mini-boss ×10 HP at Lv12 (combat §2.1)
    boss.hp = 1;
    hitMob(z, p, boss, 1, h.w.now);
    expect(boss.alive).toBe(false);
    expect(h.quest().main?.status).toBe("READY");
    expect(z.fieldBoss("BOSS002")).toBeNull();
    // it comes back three minutes later, with a line in the zone chat
    const back = c.next<SChatMsg>(Op.S_CHAT_MSG, (m) => m.text.includes("lại xuất hiện"));
    z.update(h.w.now + 3 * 60_000 + 50);
    await back;
    expect(z.fieldBoss("BOSS002")?.alive).toBe(true);
    const r16 = await h.turnIn("NPC046", "M008");
    expect(p.bag.items.find((i) => i.item === "giay_thi_sinh")).toMatchObject({ level: 12, rarity: "good" });
    expect(r16.update).toMatchObject({ chapterDone: true, chapter: 2, done: 4, total: 4, main: null });
    expect(r16.update.wait).toContain("Vòng 2");
    c.close();
  });

  it("Lùn Cướp Đồng call their pack, Lợn Rừng Đồng charge, the boar king heals when left alone", async () => {
    const { h } = await newHero("Bảo Ngọc");
    const { p } = h;
    afterChapter1(p);
    gainExp(p, 40_000, h.w.now);
    p.invulnUntil = Infinity; // nobody dies in this test

    // PACK: hit one bandit, the ones around it turn on the attacker
    await h.goto("M009", 1950, 2);
    const z = p.zone!;
    const [first, second, far] = [...z.mobs.values()].filter((m) => m.def.id === "MOB009" && m.alive);
    for (const [m, dx] of [
      [second, 60],
      [far, 600],
    ] as const)
      Object.assign(m!, { x: first!.x + dx, y: first!.y });
    for (const m of [first, second, far]) [m!.targetId, m!.mode] = [0, "idle"];
    first!.hp = first!.max.hp;
    hitMob(z, p, first!, 0.01, h.w.now);
    expect(first!.targetId).toBe(p.id);
    expect(second!.targetId).toBe(p.id);
    expect(far!.targetId).toBe(0);

    // charge: a boar rushes at a player in reach before its hit lands
    await h.goto("M009", 500, 3);
    const z3 = p.zone!;
    const boar = [...z3.mobs.values()].find((m) => m.def.id === "MOB008" && m.alive)!;
    p.body = { ...p.body, x: boar.x + 130, y: boar.y };
    p.invulnUntil = 0;
    boar.atkReadyAt = 0;
    boar.targetId = 0;
    boar.mode = "idle";
    const x0 = boar.x;
    tickMob(z3, boar, h.w.now);
    expect(boar.dash).toMatchObject({ dir: 1, speed: 300 });
    for (let t = 1; t <= 4; t++) tickMob(z3, boar, h.w.now + t * 50);
    expect(boar.x).toBeGreaterThan(x0 + 40);
    p.invulnUntil = Infinity;

    // the boar king alone: after a while with nobody in reach it heals up and the fight starts over
    const king = z3.fieldBoss("BOSS002")!;
    p.body = { ...p.body, x: king.x - 100, y: king.y };
    hitMob(z3, p, king, 1, h.w.now);
    expect(king.hp).toBeLessThan(king.max.hp);
    await h.goto("M009", 100, 3);
    const now = h.w.now;
    const { tickBoss } = await import("../src/world/boss");
    tickBoss(z3, king, now + 1000);
    tickBoss(z3, king, now + 10_000);
    expect(king.hp).toBe(king.max.hp);
    expect(king.boss!.damage.size).toBe(0);
    h.c.close();
  });

  it("falling in Đồng Lúa revives in Thượng Đô (combat §7)", async () => {
    const { h } = await newHero("Gia Huy");
    const { c, p } = h;
    afterChapter1(p);
    await h.goto("M009", 400);
    p.hp = 0;
    p.alive = false;
    const town = c.next<SMapChange>(Op.S_MAP_CHANGE);
    c.send(Op.C_REVIVE, { mode: "TOWN" });
    expect((await town).map.id).toBe("M005");
    expect(p.alive).toBe(true);
    c.close();
  });
});

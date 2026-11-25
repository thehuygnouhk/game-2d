import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  ErrorCode,
  Op,
  type SBossAnnounce,
  type SBossState,
  type SEnterWorld,
  type SInstanceState,
  type SInventoryDelta,
  type SMapChange,
  type SNpcDialog,
  type SQuestUpdate,
  type SScene,
  type SSkillsUpdate,
  type SStatsUpdate,
} from "@htk/shared";
import { nextOccurrence } from "../src/world/boss";
import { gainExp, hitMob } from "../src/world/combat";
import type { Mob, Player } from "../src/world/entities";
import { type GameServer, startGameServer } from "../src/server";
import { Client } from "./helpers/client";

// Step B4 (docs/product/roadmap.md §8): Chapter 1 online, played through the protocol by a development guest.
let server: GameServer;
let clock = Date.UTC(2026, 10, 25, 2, 0); // 09:00 in Asia/Ho_Chi_Minh
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

beforeAll(async () => {
  server = await startGameServer({ port: 0, mapId: "M001", devGuest: true, seed: 11, realmId: 1, log: () => {} });
  server.world.clock = () => clock;
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
  /** move through the real map change path, then wait for it */
  async goto(map: string, x: number, y?: number) {
    const zone = this.p.zone?.mapId === map ? this.p.zone : this.w.zone(map, 1)!;
    const n = this.c.frames.length;
    this.w.transfer(this.p, zone, x, y ?? zone.map.spawn.y);
    await this.c
      .next<SMapChange>(Op.S_MAP_CHANGE, () => true)
      .catch(() => {
        if (this.c.frames.length === n) throw new Error("no map change");
      });
  }
  async toNpc(id: string, map = "M001") {
    const n = server.world.content.maps.get(map)!.npcs.find((x) => x.id === id)!;
    await this.goto(map, n.x + 20, n.y);
  }
  async talk(npcId: string): Promise<SNpcDialog> {
    const wait = this.c.next<SNpcDialog>(Op.S_NPC_DIALOG, (d) => d.npcId === npcId);
    this.c.send(Op.C_NPC_INTERACT, { npcId });
    return wait;
  }
  async choose(npcId: string, optionId: string) {
    this.c.send(Op.C_NPC_CHOICE, { npcId, optionId });
  }
  async accept(npcId: string, map = "M001") {
    await this.toNpc(npcId, map);
    const d = await this.talk(npcId);
    expect(d.options.map((o) => o.id)).toContain("ACCEPT");
    const up = this.c.next<SQuestUpdate>(Op.S_QUEST_UPDATE, (u) => u.event?.kind === "accepted");
    await this.choose(npcId, "ACCEPT");
    return (await up).main!;
  }
  async turnIn(npcId: string, map = "M001") {
    await this.toNpc(npcId, map);
    const d = await this.talk(npcId);
    expect(d.options.map((o) => o.id)).toContain("TURNIN");
    const delta = this.c.next<SInventoryDelta>(Op.S_INVENTORY_DELTA);
    const up = this.c.next<SQuestUpdate>(Op.S_QUEST_UPDATE, (u) => u.event?.kind === "completed");
    await this.choose(npcId, "TURNIN");
    return { delta: await delta, update: await up };
  }
  /** bring down n monsters of a kind with real server hits (they are left on 1 HP first) */
  async kill(mobId: string, map: string, n: number) {
    for (let i = 0; i < n; i++) {
      let m: Mob | undefined;
      for (let t = 0; t < 100 && !m; t++) {
        if (this.p.zone?.mapId !== map) await this.goto(map, 200);
        m = [...this.p.zone!.mobs.values()].find((x) => x.def.id === mobId && x.alive);
        if (!m) await sleep(100);
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

async function newHero(name: string, origin = "VILLAGER"): Promise<{ h: Hero; enter: SEnterWorld }> {
  const c = await Client.open(server.port);
  const enter = await c.join(name, origin);
  return { h: new Hero(c, playerOf(enter.you)), enter };
}

describe("Chapter 1 online (step B4)", () => {
  it("plays Q_MAIN_01 to Q_MAIN_12: NPCs, quests, equipment, shop, DG01, Lễ Khai Thư", async () => {
    const { h, enter } = await newHero("Tiểu Vy");
    const { c, p } = h;
    expect(enter.quests).toMatchObject({
      done: 0,
      total: 12,
      chapterDone: false,
      main: { id: "Q_MAIN_01", status: "AVAILABLE" },
    });
    expect(enter.npcs.map((n) => n.id)).toEqual(["NPC001", "NPC002", "NPC040", "NPC003", "NPC004"]);
    expect(enter.character.cls).toBeNull();

    // too far from Thầy: refused
    c.send(Op.C_NPC_INTERACT, { npcId: "NPC001" });
    expect((await c.next<{ code: number }>(Op.S_ERROR)).code).toBe(ErrorCode.E_OUT_OF_RANGE);

    // Q_MAIN_01: talk to Bà Mơ, back to Thầy
    const q1 = await h.accept("NPC001");
    expect(q1).toMatchObject({
      id: "Q_MAIN_01",
      status: "ACTIVE",
      objectives: [{ type: "TALK", target: "NPC002", got: 0 }],
    });
    await h.toNpc("NPC002");
    const baMo = await h.talk("NPC002");
    expect(baMo.text).toContain("Cầm cái bánh");
    await c.wait<SQuestUpdate>(Op.S_QUEST_UPDATE, (u) => u.main?.status === "READY");
    const r1 = await h.turnIn("NPC001");
    expect(r1.delta.soft).toBe(100);
    expect(r1.update.main?.id).toBe("Q_MAIN_02");
    expect(p.bag.items.find((i) => i.item === "potion_hp")?.qty).toBe(5);

    // Q_MAIN_02: five Nấm Lùn, then the wooden sword goes on (items §3)
    await h.accept("NPC001");
    await h.kill("MOB001", "M002", 5);
    expect(h.quest().main?.status).toBe("READY");
    await h.turnIn("NPC001");
    const sword = p.bag.items.find((i) => i.item === "kiem_go_tap")!;
    expect(sword).toMatchObject({ kind: "gear", slot: "weapon", level: 1, rarity: "common", main: { atk: 14 } });
    const atk0 = p.stats.atk;
    const wornWait = c.next<SInventoryDelta>(Op.S_INVENTORY_DELTA, (d) => !!d.equip?.weapon);
    const statsWait = c.next<SStatsUpdate>(Op.S_STATS_UPDATE, (s) => s.atk !== undefined);
    c.send(Op.C_EQUIP, { instanceId: sword.instanceId });
    expect((await wornWait).remove).toEqual([sword.instanceId]);
    expect((await statsWait).atk).toBe(atk0 + 14);

    // Q_MAIN_03: Thỏ Đốm drop Củ Cải Non while the quest needs them (quests §4.1)
    gainExp(p, 2000, h.w.now);
    await h.accept("NPC040");
    await h.kill("MOB002", "M002", 6);
    expect(h.quest().main?.objectives.map((o) => o.got)).toEqual([6, 4]);
    await h.turnIn("NPC040");

    // Q_MAIN_04: the herbs of Đồng Hoa, picked one by one, growing back after 20 s
    const q4 = await h.accept("NPC003");
    expect(q4.nodes?.mapId).toBe("M002");
    const pts = q4.nodes!.points;
    expect(pts).toHaveLength(8);
    for (let i = 0; i < 5; i++) {
      await h.goto("M002", pts[i]!.x, pts[i]!.y);
      const up = c.next<SQuestUpdate>(Op.S_QUEST_UPDATE);
      c.send(Op.C_USE_OBJECT, { objectId: pts[i]!.id });
      await up;
    }
    expect(h.quest().main?.status).toBe("READY");
    await h.goto("M002", pts[0]!.x, pts[0]!.y);
    c.send(Op.C_USE_OBJECT, { objectId: pts[0]!.id });
    expect((await c.next<{ message: string }>(Op.S_ERROR)).message).toBe("NOT_NEEDED");
    await h.turnIn("NPC003", "M002");

    // Lam Nhi's shop: buy with Quan through the ledger, sell back at 25% (economy §3)
    await h.toNpc("NPC003", "M002");
    await h.talk("NPC003");
    const shopWait = c.next<SNpcDialog>(Op.S_NPC_DIALOG, (d) => !!d.shop);
    await h.choose("NPC003", "SHOP");
    const shop = (await shopWait).shop!;
    expect(shop.items.map((i) => [i.item, i.price])).toContainEqual(["potion_hp", 20]);
    const soft0 = p.bag.soft;
    c.send(Op.C_SHOP_BUY, { shopId: "NPC003", itemId: "potion_mp_m", qty: 2, idemKey: crypto.randomUUID() });
    const bought = await c.next<SInventoryDelta>(Op.S_INVENTORY_DELTA);
    expect(bought.soft).toBe(soft0 - 128);
    const mpm = p.bag.items.find((i) => i.item === "potion_mp_m")!;
    c.send(Op.C_SHOP_SELL, { instanceId: mpm.instanceId, qty: 1, idemKey: crypto.randomUUID() });
    expect((await c.next<SInventoryDelta>(Op.S_INVENTORY_DELTA)).soft).toBe(soft0 - 128 + 16);
    c.send(Op.C_SHOP_BUY, { shopId: "NPC003", itemId: "potion_hp_m", qty: 99, idemKey: crypto.randomUUID() });
    expect((await c.next<{ code: number }>(Op.S_ERROR)).code).toBe(ErrorCode.E_NOT_ENOUGH_SOFT);

    // Q_MAIN_05: meet Khôi on Đồng Hoa and land Tụ Mana Chấn three times
    gainExp(p, 5000, h.w.now);
    expect(p.lv).toBeGreaterThanOrEqual(5);
    await h.accept("NPC004", "M002");
    expect(h.quest().main?.objectives[0]!.got).toBe(1);
    for (let i = 0; i < 3; i++) {
      const z = p.zone!;
      const m = [...z.mobs.values()].find(
        (x) => x.alive && !x.def.ai.flying && z.surfaceBelow(x.x - 50, x.y - 30) === x.y,
      )!;
      await h.goto("M002", m.x - 50, m.y - 30);
      m.hp = m.max.hp = 100000;
      p.cds.clear();
      p.gcdUntil = 0;
      p.mp = p.stats.mp;
      p.body = { ...p.body, facing: 1 };
      const up = c.next<SQuestUpdate>(Op.S_QUEST_UPDATE);
      c.send(Op.C_USE_SKILL, { skillId: "SKL_MANA_BURST", targetId: m.id, seq: p.ack });
      await up;
    }
    expect(h.quest().main?.status).toBe("READY");
    await h.turnIn("NPC004", "M002");

    // Q_MAIN_06-09 in the forest and the well cave
    gainExp(p, 1e7, h.w.now);
    expect(p.lv).toBe(9); // the Lv9 cap waits for Q_MAIN_11
    await h.accept("NPC040");
    await h.kill("MOB003", "M003", 8);
    await h.turnIn("NPC040");
    await h.accept("NPC040");
    await h.kill("MOB004", "M003", 6);
    await h.turnIn("NPC040");
    await h.accept("NPC002");
    await h.kill("MOB006", "M004", 8);
    await h.turnIn("NPC002");
    await h.accept("NPC003");
    await h.kill("MOB007", "M004", 6);
    await h.turnIn("NPC003");

    // Q_MAIN_10: DG01, a private run; Trang Lạc tears into four pages at 50% (maps §5.3, §6.2)
    await h.accept("NPC001");
    const gate = h.w.content.maps.get("M004")!.portals.find((g) => g.to === "DG01")!;
    await h.goto("M004", gate.x + 20, gate.y + gate.h);
    const into = c.next<SMapChange>(Op.S_MAP_CHANGE);
    const inst = c.next<SInstanceState>(Op.S_INSTANCE_STATE);
    c.send(Op.C_USE_PORTAL, { portalId: gate.id, seq: p.ack });
    expect((await into).map.id).toBe("DG01");
    expect(await inst).toMatchObject({ kind: "DUNGEON", bossDown: false });
    expect(h.w.instances.size).toBe(1);
    const dz = p.zone!;
    expect(dz.inst?.scale).toEqual({ hp: 0.3, atk: 0.7, reward: 0.8 });
    expect([...dz.mobs.values()].map((m) => m.def.id).sort()).toEqual(
      [...Array(7).fill("MOB006"), ...Array(4).fill("MOB007")].sort(),
    );
    const woke = c.next<SBossState>(Op.S_BOSS_STATE);
    await h.goto("DG01", 1800);
    const st = await woke;
    expect(st).toMatchObject({ name: "Trang Lạc", lv: 9, hpPct: 1 });
    const boss = dz.inst!.boss!;
    expect(boss.max.hp).toBe(Math.round(Math.round(30 + 22 * 9 ** 1.5) * 10 * 0.3));
    boss.hp = Math.floor(boss.max.hp * 0.5) + 1;
    hitMob(dz, p, boss, 1, h.w.now);
    expect(boss.boss!.torn).toBe(true);
    const pages = boss.boss!.pieces;
    expect(pages).toHaveLength(4);
    expect(pages[0]!.max.hp).toBe(Math.round(boss.max.hp * 0.125));
    for (const pg of pages) {
      pg.hp = 1;
      hitMob(dz, p, pg, 1, h.w.now);
    }
    const chestState = await c.wait<SInstanceState>(Op.S_INSTANCE_STATE, (s) => !!s.bossDown);
    expect(h.quest().main?.status).toBe("READY");
    await h.goto("DG01", chestState.chest!.x);
    const softBefore = p.bag.soft;
    c.send(Op.C_USE_OBJECT, { objectId: "CHEST" });
    const loot = await c.next<SInventoryDelta>(Op.S_INVENTORY_DELTA, (d) => !!d.gained);
    expect(loot.soft - softBefore).toBe(240);
    expect(loot.gained!.map((g) => g.item ?? g.kind)).toEqual(expect.arrayContaining(["soft", "potion_hp_m"]));
    expect(loot.gained!.find((g) => g.kind === "gear")).toMatchObject({ level: 9, rarity: "good" });
    c.send(Op.C_USE_OBJECT, { objectId: "CHEST" });
    expect((await c.next<{ message: string }>(Op.S_ERROR)).message).toBe("ALREADY_OPENED");
    const out = c.next<SMapChange>(Op.S_MAP_CHANGE);
    c.send(Op.C_LEAVE_INSTANCE);
    expect((await out).map.id).toBe("M004");
    expect(h.w.instances.size).toBe(0);
    const r10 = await h.turnIn("NPC001");
    expect(r10.delta.add.map((a) => a.item)).toContain("ao_suoi_mo");

    // Q_MAIN_11: the night scene; finishing it completes the quest and opens Lv10
    await h.toNpc("NPC001");
    await h.talk("NPC001");
    const scene = c.next<SScene>(Op.S_SCENE);
    await h.choose("NPC001", "ACCEPT");
    expect((await scene).lines.map((l) => l.who)).toEqual(["NPC001", "NPC003", "NPC004", "NPC001", "PLAYER", "NPC001"]);
    const done11 = c.next<SQuestUpdate>(Op.S_QUEST_UPDATE, (u) => u.event?.kind === "completed");
    await h.choose("NPC001", "SCENE_DONE");
    await done11;
    expect(p.lv).toBeGreaterThanOrEqual(10);

    // Q_MAIN_12: the ceremony hall, the altar, Hỏa; the chapter ends
    await h.toNpc("NPC001");
    await h.talk("NPC001");
    const hall = c.next<SMapChange>(Op.S_MAP_CHANGE);
    await h.choose("NPC001", "ACCEPT");
    expect((await hall).map.id).toBe("I001");
    await h.goto("I001", 500);
    const rite = c.next<SNpcDialog>(Op.S_NPC_DIALOG, (d) => !!d.rite);
    c.send(Op.C_USE_OBJECT, { objectId: "ALTAR" });
    expect((await rite).rite!.classes.map((k) => k.id)).toEqual(["FIRE", "WATER"]);
    const skills = c.next<SSkillsUpdate>(Op.S_SKILLS_UPDATE);
    const end = c.next<SScene>(Op.S_SCENE, (s) => s.key === "Q_MAIN_12");
    c.send(Op.C_CHOOSE_CLASS, { classId: "FIRE" });
    expect((await skills).skills.map((s) => s.id)).toEqual([
      "SKL_BASIC",
      "SKL_MANA_BURST",
      "SKL_FIRE_1",
      "SKL_FIRE_2",
      "SKL_FIRE_3",
    ]);
    const card = (await end).chapterEnd!;
    expect(card).toMatchObject({ letter: "Đừng tìm thầy. Hãy tìm Mười Hai Quyển.", className: "Hỏa Kiếm Sĩ" });
    expect(h.quest()).toMatchObject({ chapterDone: true, done: 12, main: null });
    expect(p.bag.equip.tome).toMatchObject({ item: "huyen_thu_so_ban", bound: true, level: 10 });
    const fireSword = p.bag.items.find((i) => i.item === "kiem_lua_tap_su")!;
    c.send(Op.C_UNEQUIP, { slot: "tome" });
    expect((await c.next<{ code: number }>(Op.S_ERROR)).code).toBe(ErrorCode.E_ITEM_BOUND);
    c.send(Op.C_EQUIP, { instanceId: fireSword.instanceId });
    await c.next<SInventoryDelta>(Op.S_INVENTORY_DELTA, (d) => d.equip?.weapon?.item === "kiem_lua_tap_su");

    // back home: Thầy has left the school; Bà Mơ offers the free class change for 24 h
    const home = c.next<SMapChange>(Op.S_MAP_CHANGE);
    c.send(Op.C_LEAVE_INSTANCE);
    expect((await home).npcs.map((n) => n.id)).not.toContain("NPC001");
    await h.toNpc("NPC002");
    expect((await h.talk("NPC002")).options.map((o) => o.id)).toContain("RITE");
    const back = c.next<SInventoryDelta>(Op.S_INVENTORY_DELTA, (d) => d.equip?.weapon === null);
    const water = c.next<SSkillsUpdate>(Op.S_SKILLS_UPDATE);
    c.send(Op.C_CHOOSE_CLASS, { classId: "WATER" });
    await back;
    expect((await water).cls).toBe("WATER");
    expect(p.bag.owns("truong_thuy_tap_su")).toBe(true);
    clock += 25 * 3600_000;
    expect((await h.talk("NPC002")).options.map((o) => o.id)).not.toContain("RITE");
    c.close();
  }, 60_000);

  it("keeps DG01 for Lv9 and above", async () => {
    const { h } = await newHero("Nhỏ Tuổi");
    const gate = h.w.content.maps.get("M004")!.portals.find((g) => g.to === "DG01")!;
    await h.goto("M004", gate.x + 20, gate.y + gate.h);
    h.c.send(Op.C_USE_PORTAL, { portalId: gate.id, seq: h.p.ack });
    expect((await h.c.next<{ code: number }>(Op.S_ERROR)).code).toBe(ErrorCode.E_LEVEL_REQUIRED);
    h.c.close();
  });

  it("schedules world bosses on the Vietnam clock, announces them and lets players bring them down", async () => {
    const e = server.world.content.events.find((x) => x.id === "EVT_BOSS_034")!;
    // 09:00 local → next is 10:00 local (03:00 UTC)
    expect(new Date(nextOccurrence(e, Date.UTC(2026, 10, 25, 2, 0))).toISOString()).toBe("2026-11-25T03:00:00.000Z");
    const well = server.world.content.events.find((x) => x.id === "EVT_R01_WELL_NIGHT")!;
    // Friday 27 Nov 2026, 20:00 local = 13:00 UTC
    expect(new Date(nextOccurrence(well, Date.UTC(2026, 10, 25, 2, 0))).toISOString()).toBe("2026-11-27T13:00:00.000Z");

    const { h } = await newHero("Săn Boss");
    await h.goto("M002", 1500);
    const soon = h.c.next<SBossAnnounce>(Op.S_BOSS_ANNOUNCE, (a) => a.kind === "SOON" && a.bossId === "BOSS034");
    clock = server.world.bosses.next.get("EVT_BOSS_034")!.at - 4 * 60_000;
    expect((await soon).text).toBe("Vua Nấm Lùn sẽ xuất hiện sau 5 phút tại Đồng Hoa Suối Mơ");
    const spawned = h.c.next<SBossAnnounce>(Op.S_BOSS_ANNOUNCE, (a) => a.kind === "SPAWN" && a.bossId === "BOSS034");
    clock += 5 * 60_000;
    const sp = await spawned;
    const live = server.world.bosses.live.find((l) => l.mob.boss!.def.id === "BOSS034")!;
    expect(live.zone.zoneNo).toBe(sp.zoneNo);
    const m = live.mob;
    expect(m.max.hp).toBe(Math.round(Math.round(30 + 22 * 5 ** 1.5) * 40));
    // summons at 60% (maps §5.1)
    if (h.p.zone !== live.zone) await h.goto("M002", 1500);
    const before = live.zone.mobs.size;
    m.hp = Math.floor(m.max.hp * 0.6);
    hitMob(live.zone, h.p, m, 1, server.world.now);
    expect(live.zone.mobs.size).toBe(before + 3);
    // the boss telegraphs its stomp before it lands
    h.p.alive = true;
    const tele = await h.c.wait<SBossState>(Op.S_BOSS_STATE, (s) => !!s.telegraphs?.length, 5000);
    expect(tele.telegraphs![0]).toMatchObject({ shape: "circle", r: 150 });
    const killed = h.c.next<SBossAnnounce>(Op.S_BOSS_ANNOUNCE, (a) => a.kind === "KILLED");
    if (!h.p.alive) {
      h.p.alive = true;
      h.p.hp = h.p.stats.hp;
    }
    m.hp = 1;
    hitMob(live.zone, h.p, m, 1, server.world.now);
    expect((await killed).text).toBe("Vua Nấm Lùn đã bị hạ bởi Săn Boss!");
    expect(server.world.bosses.live.some((l) => l.mob === m)).toBe(false);
    expect([...live.zone.drops.values()].some((d) => d.loot.kind === "soft")).toBe(true);
    const notice = await (async () => {
      await h.toNpc("NPC040");
      await h.talk("NPC040");
      const d = h.c.next<SNpcDialog>(Op.S_NPC_DIALOG, (x) => x.text.startsWith("Lịch boss"));
      await h.choose("NPC040", "SCHEDULE");
      return (await d).text;
    })();
    expect(notice).toMatch(/Vua Nấm Lùn Lv5 · Đồng Hoa Suối Mơ · lần tới \d\d:\d\d/);
    h.c.close();
  }, 30_000);

  it("casts Hỏa Cầu as a shot that burns (classes §4, Lửa Bén)", async () => {
    const { h } = await newHero("Hỏa Thử");
    const p = h.p;
    p.cls = "FIRE";
    gainExp(p, 1e6, h.w.now);
    p.quests.set("Q_MAIN_11", { quest_id: "Q_MAIN_11", status: "COMPLETED", progress: [1] });
    gainExp(p, 1e5, h.w.now);
    expect(p.lv).toBeGreaterThanOrEqual(10);
    await h.goto("M002", 200);
    const z = p.zone!;
    const m = [...z.mobs.values()].find(
      (x) => x.alive && !x.def.ai.flying && z.surfaceBelow(x.x - 40, x.y - 30) === x.y,
    )!;
    m.hp = m.max.hp = 100000;
    await h.goto("M002", m.x - 40, m.y - 30);
    p.body = { ...p.body, facing: 1 };
    p.mp = p.stats.mp;
    for (const x of z.mobs.values()) x.hp = x.max.hp = 100000;
    const dmg = h.c.next<{ targetId: number; sourceId: number; amount: number }>(
      Op.S_DAMAGE,
      (d) => d.sourceId === p.id,
    );
    h.c.send(Op.C_USE_SKILL, { skillId: "SKL_FIRE_1", targetId: m.id, seq: p.ack });
    const first = await dmg;
    expect(first.amount).toBeGreaterThan(0);
    const hit = z.mobs.get(first.targetId)!;
    expect(hit.burn).not.toBeNull();
    const burn = hit.burn!.dmg;
    const tick = await h.c.next<{ targetId: number; amount: number }>(Op.S_DAMAGE, (d) => d.targetId === hit.id, 2500);
    expect(tick.amount).toBe(burn);
    h.c.close();
  });
});

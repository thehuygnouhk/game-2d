import { createHash } from "node:crypto";
import type { Quest } from "@htk/content";
import type { QuestRow } from "@htk/db";
import {
  CLASS_CHANGE_FREE_MS,
  type ClassId,
  type ClassInfo,
  ErrorCode,
  MAX_LEVEL,
  NPC_RANGE,
  type NpcOption,
  Op,
  OBJECT_RANGE,
  type QuestObjectiveView,
  type QuestView,
  RULES,
  type SNpcDialog,
  type SQuestUpdate,
  type SScene,
} from "@htk/shared";
import { fail, gainExp, sendStats } from "./combat";
import type { Player } from "./entities";
import type { World } from "./world";

/**
 * Main quest chain on the server (docs/game-design/06-quests-and-missions.md §2-5): Chapter 1 (step B4) and
 * Chapter 2 so far (step B5.1). Quest state lives in character_quests; the client only sees views and asks
 * through NPC choices.
 */

/** Đài Khai Thư in the ceremony hall I001 (tile 14, three tiles wide), quests §4. */
export const ALTAR = { x: 496, y: 352 } as const;

type Status = QuestView["status"];
type Ev = QuestObjectiveView["type"];

/** A stable uuid for "this character completes this quest": the ledger key of the reward (database §6). */
export function stableUuid(...parts: string[]): string {
  const h = createHash("sha1").update(parts.join("|")).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

const prefix = (q: Quest) => q.nameKey.replace(/\.title$/, "");
const ownerKey = (p: Player) => p.characterId ?? `guest:${p.name}`;

export class Quests {
  constructor(private readonly w: World) {}

  private get c() {
    return this.w.content;
  }

  /** The first main quest not completed yet (null: Chapter 1 is over). */
  current(p: Player): Quest | null {
    return this.c.mainQuests.find((q) => !p.questDone(q.id)) ?? null;
  }
  chapterDone(p: Player): boolean {
    return this.current(p) === null;
  }
  /** Lễ Khai Thư is over: Thầy has left, Bà Mơ takes over the class change (quests §4, classes §5). */
  pastCeremony(p: Player): boolean {
    return p.questDone("Q_MAIN_12");
  }
  /** quests §4: Lv10 waits for Q_MAIN_11 */
  levelCap(p: Player): number {
    return p.questDone("Q_MAIN_11") ? MAX_LEVEL : RULES.levelCapChapter1;
  }

  status(p: Player, q: Quest): Status {
    const r = p.quests.get(q.id);
    if (r && r.status !== "COMPLETED") return r.status === "READY" ? "READY" : "ACTIVE";
    return p.lv >= q.levelMin && q.prerequisites.every((id) => p.questDone(id)) ? "AVAILABLE" : "LOCKED";
  }

  private npcName(id: string): string {
    const n = this.c.npcs.get(id);
    return n ? this.c.text(n.nameKey) : id;
  }
  private mapName(id: string): string {
    const m = this.c.maps.get(id);
    return m ? this.c.text(m.nameKey) : id;
  }

  private objective(p: Player, q: Quest, k: number): QuestObjectiveView {
    const o = q.objectives[k]!;
    const label = this.c.text(`${prefix(q)}.objectives.${k}`);
    const map = this.c.maps.get(o.map);
    let where = this.mapName(o.map),
      x: number | undefined;
    if (o.type === "TALK") x = map?.npcs.find((n) => n.id === o.target)?.x;
    if (o.type === "KILL") x = map?.mobSpawns.find((s) => s.mob === o.target)?.x;
    if (o.type === "COLLECT") {
      const src = this.c.questItems[o.target]!;
      if ("mob" in src) {
        x = map?.mobSpawns.find((s) => s.mob === src.mob)?.x;
        const mob = this.c.monsters.get(src.mob);
        where = `rơi từ ${mob ? this.c.text(mob.nameKey) : src.mob} (${Math.round(src.chance * 100)}%) · ${where}`;
      } else where = `hái ở bụi thảo dược phát sáng (F) · ${where}`;
    }
    if (o.type === "USE_SKILL") where = `phím 1 trúng quái · ${where}`;
    if (o.type === "BOSS") {
      const dg = this.c.dungeons.get(o.map);
      if (dg) where = `${where} · cổng ở cuối ${this.mapName(dg.entry.map)}, cần Lv${dg.minLevel}`;
      else x = map?.bossSpawns.find((b) => b.boss === o.target)?.x;
    }
    if (o.type === "SCENE") where = "Nhà Học Suối Mơ, buổi tối";
    if (o.type === "REACH") where = `${where} · Đài Khai Thư`;
    const hint = `${prefix(q)}.where.${k}`; // a written hint wins (step B5.1)
    if (this.c.i18n.has(hint)) where = this.c.text(hint);
    const got = p.quests.get(q.id)?.progress[k] ?? 0;
    return {
      type: o.type,
      target: o.target,
      label,
      count: o.count,
      got,
      map: o.map,
      mapName: this.mapName(o.map),
      where,
      ...(x !== undefined ? { x } : {}),
    };
  }

  rewards(q: Quest): QuestView["rewards"] {
    const items = q.rewards.items.flatMap((r) => p0Summary(this.w, r.id, r.count));
    const out: QuestView["rewards"] = { exp: q.rewards.exp, soft: q.rewards.soft, items };
    if (q.rewards.skill) {
      const sk = this.c.skills.get(q.rewards.skill);
      out.skill = sk ? this.c.text(sk.nameKey) : q.rewards.skill;
    }
    if (q.id === "Q_MAIN_12") out.note = "Huyền Thư Sơ Bản, vũ khí hệ";
    if (q.id === "Q_MAIN_11") out.note = "Mở khóa Lv10";
    return out;
  }

  view(p: Player, q: Quest): QuestView {
    const status = this.status(p, q);
    const v: QuestView = {
      id: q.id,
      title: this.c.text(q.nameKey),
      status,
      levelMin: q.levelMin,
      giver: { id: q.giver, name: this.npcName(q.giver) },
      turnIn: { id: q.turnIn, name: this.npcName(q.turnIn) },
      objectives: q.objectives.map((_, k) => this.objective(p, q, k)),
      rewards: this.rewards(q),
      text: { accept: this.c.text(q.dialogue.accept), progress: this.c.text(q.dialogue.progress) },
    };
    for (const [item, src] of Object.entries(this.c.questItems))
      if ("node" in src && this.needs(p, item)) {
        const z = this.w.zone(src.node, 1);
        if (!z) continue;
        v.nodes = {
          mapId: src.node,
          points: src.cols.map((col, i) => {
            const x = col * 32 + 16;
            return { id: `HERB:${i}`, x, y: z.surfaceBelow(x, 0) ?? 0 };
          }),
        };
      }
    return v;
  }

  update(p: Player, extra: Partial<SQuestUpdate> = {}): SQuestUpdate {
    const q = this.current(p);
    const all = this.c.mainQuests;
    // the chapter of the current quest, or of the last one when everything written so far is done
    const chapter = q?.chapter ?? all[all.length - 1]?.chapter ?? 1;
    const inChapter = all.filter((x) => x.chapter === chapter);
    return {
      main: q ? this.view(p, q) : null,
      done: inChapter.filter((x) => p.questDone(x.id)).length,
      total: inChapter.length,
      chapterDone: !q,
      chapter,
      chapterName: this.c.text(`quest.chapter.${chapter}`),
      ...(q ? {} : { wait: this.c.text(`quest.wait.${chapter}`) }),
      ...extra,
    };
  }
  send(p: Player, extra: Partial<SQuestUpdate> = {}): void {
    p.out.send(Op.S_QUEST_UPDATE, this.update(p, extra));
  }

  /** the active quest still needs this quest item */
  needs(p: Player, item: string): boolean {
    const q = this.current(p);
    const r = q && p.quests.get(q.id);
    if (!q || !r || r.status === "READY" || r.status === "COMPLETED") return false;
    return q.objectives.some((o, k) => o.type === "COLLECT" && o.target === item && (r.progress[k] ?? 0) < o.count);
  }

  /**
   * A game event (quests §2: mob.killed, item.acquired, npc.talked, skill.used, boss.killed, map.entered).
   * TALK and USE_SKILL count only on the objective's map. Returns true when it counted.
   */
  event(p: Player, type: Ev, target: string, n = 1): boolean {
    const q = this.current(p);
    const r = q && p.quests.get(q.id);
    if (!q || !r || r.status === "READY" || r.status === "COMPLETED") return false;
    const map = p.zone?.mapId;
    let hit = false,
      text = "";
    q.objectives.forEach((o, k) => {
      if (o.type !== type || o.target !== target || (r.progress[k] ?? 0) >= o.count) return;
      if ((type === "TALK" || type === "USE_SKILL") && o.map !== map) return;
      r.progress[k] = Math.min(o.count, (r.progress[k] ?? 0) + n);
      hit = true;
      text = `${this.c.text(`${prefix(q)}.objectives.${k}`)} ${r.progress[k]}/${o.count}`;
    });
    if (!hit) return false;
    p.questDirty = true;
    if (r.status === "ACCEPTED") r.status = "IN_PROGRESS";
    const ready = q.objectives.every((o, k) => (r.progress[k] ?? 0) >= o.count);
    if (ready) {
      r.status = "READY";
      this.persist(p, r);
    }
    this.send(p, {
      progress: type === "TALK" ? undefined : text,
      ...(ready ? { event: { kind: "ready", title: this.c.text(q.nameKey) } } : {}),
    });
    return true;
  }

  private persist(p: Player, r: QuestRow): void {
    p.questDirty = false;
    const row = { ...r, progress: [...r.progress] };
    void p.enqueue(() => p.store.saveQuest(p, row)).catch((e) => p.store.onError(p, "saveQuest", e));
  }

  /* ---------------- NPCs ---------------- */
  /** The NPC stands on the player's map and the player is close enough (server-design §6.1 tolerance). */
  near(p: Player, npcId: string): boolean {
    const z = p.zone;
    if (!z || !this.npcsOn(p, z.mapId).some((n) => n.id === npcId)) return false;
    const n = z.map.npcs.find((x) => x.id === npcId)!;
    return Math.abs(p.body.x - n.x) <= NPC_RANGE + RULES.rangeTolerance && Math.abs(p.body.y - n.y) <= 140;
  }

  /**
   * NPCs shown on a map for this player (map objects showAfter / hideAfter): Thầy Bạch Vân leaves the school
   * after the ceremony (quests §4); Lam Nhi and Khôi go to Thượng Đô after Q_MAIN_13 (step B5.1).
   */
  npcsOn(p: Player, mapId: string) {
    const m = this.c.maps.get(mapId);
    if (!m) return [];
    return m.npcs.filter(
      (n) => (!n.showAfter || p.questDone(n.showAfter)) && (!n.hideAfter || !p.questDone(n.hideAfter)),
    );
  }

  private talkHere(p: Player, npcId: string): number {
    const q = this.current(p);
    const r = q && p.quests.get(q.id);
    if (!q || !r || r.status === "READY") return -1;
    return q.objectives.findIndex(
      (o, k) => o.type === "TALK" && o.target === npcId && o.map === p.zone?.mapId && (r.progress[k] ?? 0) < o.count,
    );
  }

  canRechoose(p: Player): boolean {
    return !!p.cls && this.w.clock() - p.clsChangedAt < CLASS_CHANGE_FREE_MS;
  }

  /** C_NPC_INTERACT: the line and the choices (ui-ux §5). Talking may complete a TALK objective. */
  dialog(p: Player, npcId: string, override?: string): SNpcDialog {
    const c = this.c,
      npc = c.npcs.get(npcId)!;
    const here = `${npc.lineKey}_${(p.zone?.mapId ?? "").toLowerCase()}`; // the line for this map, if written
    let text = c.text(c.i18n.has(here) ? here : npc.lineKey);
    const options: NpcOption[] = [];
    const q = this.current(p);
    const title = q ? c.text(q.nameKey) : "";
    const ti = this.talkHere(p, npcId);
    if (q && ti >= 0) {
      const key = `${prefix(q)}.talk.${npcId.toLowerCase()}`;
      if (c.i18n.has(key)) text = c.text(key);
      this.event(p, "TALK", npcId);
    }
    const st = q ? this.status(p, q) : null;
    if (q && st === "AVAILABLE" && q.giver === npcId) {
      text = c.text(q.dialogue.accept);
      options.push({ id: "ACCEPT", label: c.text("dialog.opt_accept", { title }), mark: "!" });
    } else if (q && st === "LOCKED" && q.giver === npcId) {
      text += ` ${c.text("dialog.level", { lv: q.levelMin, title })}`;
    } else if (q && st === "READY" && q.turnIn === npcId) {
      text = `${c.text("dialog.ready")} “${title}”`;
      options.push({ id: "TURNIN", label: c.text("dialog.opt_turnin", { title }), mark: "?", style: "ok" });
    } else if (q && st === "ACTIVE" && q.turnIn === npcId && ti < 0) {
      text = c.text(q.dialogue.progress);
      if (this.sceneLeft(p, q)) options.push({ id: "SCENE", label: c.text("dialog.opt_scene"), mark: "!" });
      options.push({ id: "QUESTS", label: c.text("dialog.opt_quests", { title }), mark: "?", style: "dim" });
    }
    const inHall = p.zone?.inst?.kind === "CEREMONY";
    if (npcId === "NPC001" && q?.id === "Q_MAIN_12" && st === "ACTIVE") {
      if (inHall) {
        text = c.text("dialog.ceremony_wait");
        options.unshift({ id: "ALTAR", label: c.text("dialog.opt_altar"), mark: "!" });
      } else options.unshift({ id: "CEREMONY", label: c.text("dialog.opt_ceremony"), mark: "!" });
    }
    if (npcId === (this.pastCeremony(p) ? "NPC002" : "NPC001") && this.canRechoose(p) && !inHall)
      options.push({ id: "RITE", label: c.text("dialog.opt_rite") });
    if (c.shops.has(npcId)) options.push({ id: "SHOP", label: c.text("dialog.opt_shop") });
    if (npcId === "NPC040") options.push({ id: "SCHEDULE", label: c.text("dialog.opt_schedule") });
    options.push({ id: "CLOSE", label: c.text("dialog.opt_close") });
    return { npcId, name: c.text(npc.nameKey), face: npc.face, text: override ?? text, options: options.slice(0, 6) };
  }

  interact(p: Player, npcId: string, refSeq: number): void {
    if (!this.c.npcs.has(npcId) || !this.near(p, npcId))
      return fail(p, ErrorCode.E_OUT_OF_RANGE, refSeq, "NPC_TOO_FAR");
    p.out.send(Op.S_NPC_DIALOG, this.dialog(p, npcId));
  }

  /** C_NPC_CHOICE (network-protocol §6.6). */
  choice(p: Player, npcId: string, optionId: string, refSeq: number): void {
    if (optionId === "SCENE_DONE") return this.sceneDone(p, refSeq);
    if (!this.c.npcs.has(npcId) || !this.near(p, npcId))
      return fail(p, ErrorCode.E_OUT_OF_RANGE, refSeq, "NPC_TOO_FAR");
    const q = this.current(p);
    switch (optionId) {
      case "ACCEPT":
        if (!q || q.giver !== npcId || this.status(p, q) !== "AVAILABLE")
          return fail(p, ErrorCode.E_QUEST_NOT_AVAILABLE, refSeq, "QUEST_NOT_AVAILABLE");
        return this.accept(p, q);
      case "TURNIN":
        if (!q || q.turnIn !== npcId) return fail(p, ErrorCode.E_QUEST_NOT_AVAILABLE, refSeq, "QUEST_NOT_AVAILABLE");
        if (this.status(p, q) !== "READY") return fail(p, ErrorCode.E_QUEST_INCOMPLETE, refSeq, "QUEST_INCOMPLETE");
        return void this.turnIn(p, q, npcId, refSeq);
      case "SHOP": {
        const shop = this.c.shops.get(npcId);
        if (!shop) return fail(p, ErrorCode.E_INVALID_TARGET, refSeq, "NO_SHOP");
        p.shopNpc = npcId;
        const d = this.dialog(p, npcId);
        d.shop = {
          id: npcId,
          name: this.c.text(shop.nameKey),
          items: shop.sells.map((id) => {
            const it = this.c.items.get(id)!;
            return {
              item: id,
              name: this.c.text(it.nameKey),
              icon: it.icon.replace(/^items\//, ""),
              price: it.value ?? 0,
              ...(it.healHp ? { healHp: it.healHp } : {}),
              ...(it.healMp ? { healMp: it.healMp } : {}),
            };
          }),
        };
        return p.out.send(Op.S_NPC_DIALOG, d);
      }
      case "SCHEDULE":
        return p.out.send(Op.S_NPC_DIALOG, this.dialog(p, npcId, this.w.bosses.scheduleText()));
      case "SCENE": {
        // the quest scene again (it was closed or the connection dropped before its last line)
        const left = q && this.status(p, q) === "ACTIVE" && q.turnIn === npcId ? this.sceneLeft(p, q) : null;
        if (!left) return fail(p, ErrorCode.E_QUEST_NOT_AVAILABLE, refSeq, "NO_SCENE");
        return p.out.send(Op.S_SCENE, this.scene(p, left, true));
      }
      case "CEREMONY":
        if (q?.id !== "Q_MAIN_12" || this.status(p, q) !== "ACTIVE")
          return fail(p, ErrorCode.E_QUEST_NOT_AVAILABLE, refSeq, "QUEST_NOT_AVAILABLE");
        return this.w.openCeremony(p);
      case "ALTAR":
        return this.useAltar(p, refSeq);
      case "RITE":
        if (!this.canRechoose(p)) return fail(p, ErrorCode.E_QUEST_NOT_AVAILABLE, refSeq, "CLASS_CHANGE_CLOSED");
        return p.out.send(Op.S_NPC_DIALOG, { ...this.dialog(p, npcId), rite: this.rite(p) });
      default:
        return fail(p, ErrorCode.E_INVALID_TARGET, refSeq, "UNKNOWN_OPTION");
    }
  }

  private accept(p: Player, q: Quest): void {
    const row: QuestRow = { quest_id: q.id, status: "ACCEPTED", progress: q.objectives.map(() => 0) };
    p.quests.set(q.id, row);
    this.persist(p, row);
    this.w.log("quest.accept", { player: p.id, quest: q.id });
    this.send(p, { event: { kind: "accepted", title: this.c.text(q.nameKey) } });
    this.event(p, "TALK", q.giver); // meeting the giver on the right map counts (Q_MAIN_05)
    const sc = this.sceneLeft(p, q);
    if (sc)
      p.out.send(Op.S_SCENE, this.scene(p, sc, true)); // Q_MAIN_11, Q_MAIN_13: the scene is the quest
    else if (q.id === "Q_MAIN_12") this.w.openCeremony(p);
  }

  /** The scene a quest still waits for (a SCENE objective not done yet), or null. */
  private sceneLeft(p: Player, q: Quest): string | null {
    const r = p.quests.get(q.id);
    const k = q.objectives.findIndex((o, i) => o.type === "SCENE" && (r?.progress[i] ?? 0) < o.count);
    return k >= 0 ? q.objectives[k]!.target : null;
  }

  /** Rewards and the COMPLETED row in one transaction (CLAUDE.md rule 5), then EXP and the next quest. */
  async turnIn(p: Player, q: Quest, npcId: string | null, refSeq: number): Promise<boolean> {
    const r = p.quests.get(q.id)!;
    const loots = q.rewards.items.flatMap((it) => p.bag.lootOf(it.id, it.count));
    const done: QuestRow = { quest_id: q.id, status: "COMPLETED", progress: [...r.progress] };
    try {
      const res = await p.enqueue(() =>
        p.store.grant(p, {
          loots,
          soft: q.rewards.soft,
          reason: "QUEST_REWARD",
          idemKey: q.rewards.soft ? stableUuid(ownerKey(p), q.id) : undefined,
          quest: done,
        }),
      );
      if (res === "BAG_FULL") {
        fail(p, ErrorCode.E_INVENTORY_FULL, refSeq, "BAG_FULL");
        if (npcId) p.out.send(Op.S_NPC_DIALOG, this.dialog(p, npcId, this.c.text("dialog.bag_full")));
        return false;
      }
      if (typeof res === "string") {
        // already completed (a repeated request): only the memory catches up
        p.quests.set(q.id, done);
        this.send(p);
        return false;
      }
      p.quests.set(q.id, done);
      res.gained = q.rewards.items.flatMap((it) => p0Summary(this.w, it.id, it.count));
      p.out.send(Op.S_INVENTORY_DELTA, res);
      if (loots.length) p.recompute();
      this.w.log("quest.complete", { player: p.id, quest: q.id });
      const now = this.w.now;
      if (q.rewards.exp) gainExp(p, q.rewards.exp, now);
      else if (q.id === "Q_MAIN_11") gainExp(p, 0, now);
      sendStats(p, p.full(now));
      this.send(p, { event: { kind: "completed", title: this.c.text(q.nameKey), rewards: this.rewards(q) } });
      if (npcId && p.zone) p.out.send(Op.S_NPC_DIALOG, this.dialog(p, npcId, this.c.text(q.dialogue.complete)));
      return true;
    } catch (e) {
      p.store.onError(p, "turnIn", e);
      fail(p, ErrorCode.E_INTERNAL, refSeq, "SAVE_FAILED");
      return false;
    }
  }

  /* ---------------- scenes and the ceremony ---------------- */
  /** `report`: the scene is a quest objective, the client answers SCENE_DONE after the last line. */
  scene(p: Player, key: string, report = false): SScene {
    const sc = this.c.scenes.get(key)!;
    return {
      key,
      ...(report ? { report } : {}),
      lines: sc.lines.map((l) => ({
        who: l.who,
        name: l.who === "PLAYER" ? p.name : this.npcName(l.who),
        ...(l.who === "PLAYER" ? {} : { face: this.c.npcs.get(l.who)?.face ?? 0 }),
        text: this.c.text(l.textKey),
      })),
    };
  }

  /** The client finished a quest scene (Q_MAIN_11, Q_MAIN_13): the objective counts, the quest completes by itself. */
  private sceneDone(p: Player, refSeq: number): void {
    const q = this.current(p);
    const sc = q && this.status(p, q) !== "AVAILABLE" ? this.sceneLeft(p, q) : null;
    if (!q || !sc) return fail(p, ErrorCode.E_QUEST_NOT_AVAILABLE, refSeq, "NO_SCENE");
    this.event(p, "SCENE", sc);
    if (this.status(p, q) === "READY") void this.turnIn(p, q, null, refSeq);
  }

  rite(p: Player): SNpcDialog["rite"] {
    const c = this.c;
    const classes: ClassInfo[] = (["FIRE", "WATER"] as const).map((id) => {
      const k = c.classes.get(id)!;
      return {
        id,
        name: c.text(k.nameKey),
        role: c.text(k.roleKey ?? ""),
        weapon: c.text(k.weaponKey ?? ""),
        mods: c.text(k.modsKey ?? ""),
        passive: c.text(k.passiveKey ?? ""),
        passiveText: c.text(k.passiveTextKey ?? ""),
        skills: k.skills.map((s) => ({
          id: s.id,
          name: c.text(s.nameKey),
          lv: s.unlockLevel,
          mp: s.mp,
          cd: s.cooldownSec,
          text: c.text(String(s.textKey ?? "")),
        })),
      };
    });
    const locked = ["WIND", "BOLT", "EARTH", "PLANT", "DARK"].map((id) => ({
      id,
      name: c.text(`class.${id.toLowerCase()}.name`),
    }));
    const left = p.cls
      ? Math.max(0, Math.ceil((p.clsChangedAt + CLASS_CHANGE_FREE_MS - this.w.clock()) / 3_600_000))
      : undefined;
    return { classes, locked, current: p.cls, ...(left !== undefined ? { freeHoursLeft: left } : {}) };
  }

  /** Đài Khai Thư: open the class window (first time), or finish the ceremony if the class is already chosen. */
  useAltar(p: Player, refSeq: number): void {
    const q = this.current(p);
    const z = p.zone;
    if (z?.inst?.kind !== "CEREMONY" || q?.id !== "Q_MAIN_12" || this.status(p, q) !== "ACTIVE")
      return fail(p, ErrorCode.E_QUEST_NOT_AVAILABLE, refSeq, "ALTAR_SILENT");
    if (Math.abs(p.body.x - ALTAR.x) > OBJECT_RANGE + RULES.rangeTolerance && !this.near(p, "NPC001"))
      return fail(p, ErrorCode.E_OUT_OF_RANGE, refSeq, "TOO_FAR");
    if (p.cls) return void this.ceremonyDone(p, refSeq);
    p.out.send(Op.S_NPC_DIALOG, { ...this.dialog(p, "NPC001"), rite: this.rite(p) });
  }

  /**
   * C_CHOOSE_CLASS (classes §3, §5). First choice: only at the altar during Q_MAIN_12; gives the Huyền Thư
   * (worn) and the class weapon. Later: a free change for 24 h at Thầy (Bà Mơ after Chapter 1).
   */
  async chooseClass(p: Player, cls: ClassId, refSeq: number): Promise<void> {
    const c = this.c,
      first = !p.cls;
    const q = this.current(p);
    if (first) {
      if (p.zone?.inst?.kind !== "CEREMONY" || q?.id !== "Q_MAIN_12" || this.status(p, q) !== "ACTIVE")
        return fail(p, ErrorCode.E_QUEST_NOT_AVAILABLE, refSeq, "NOT_AT_ALTAR");
    } else {
      if (!this.canRechoose(p)) return fail(p, ErrorCode.E_QUEST_NOT_AVAILABLE, refSeq, "CLASS_CHANGE_CLOSED");
      if (!this.near(p, this.pastCeremony(p) ? "NPC002" : "NPC001"))
        return fail(p, ErrorCode.E_OUT_OF_RANGE, refSeq, "NPC_TOO_FAR");
      if (p.cls === cls) return fail(p, ErrorCode.E_INVALID_TARGET, refSeq, "SAME_CLASS");
    }
    const weapon = c.classes.get(cls)!.weapon!;
    try {
      // a worn weapon of the old class goes back to the bag first
      const worn = p.bag.equip.weapon;
      if (worn?.cls && worn.cls !== cls) {
        const off = await p.enqueue(() => p.store.unequip(p, "weapon"));
        if (off === "BAG_FULL") return fail(p, ErrorCode.E_INVENTORY_FULL, refSeq, "BAG_FULL");
        if (off) p.out.send(Op.S_INVENTORY_DELTA, off);
      }
      const tome = c.items.get("huyen_thu_so_ban")!;
      const res = await p.enqueue(() =>
        p.store.grant(p, {
          reason: "CLASS",
          loots: p.bag.owns(weapon) ? [] : p.bag.lootOf(weapon, 1),
          cls,
          ...(first
            ? {
                wear: {
                  templateId: "huyen_thu_so_ban",
                  slot: "tome" as const,
                  level: tome.levelReq ?? 10,
                  rarity: tome.rarity ?? "common",
                  bound: true,
                },
              }
            : {}),
        }),
      );
      if (res === "BAG_FULL") return fail(p, ErrorCode.E_INVENTORY_FULL, refSeq, "BAG_FULL");
      if (typeof res === "string") return fail(p, ErrorCode.E_INTERNAL, refSeq, res);
      p.cls = cls;
      if (first) p.clsChangedAt = this.w.clock();
      p.tideN = 0;
      p.tideReady = false;
      p.recompute(true);
      res.gained = [...(first ? p0Summary(this.w, "huyen_thu_so_ban", 1) : []), ...p0Summary(this.w, weapon, 1)];
      p.out.send(Op.S_INVENTORY_DELTA, res);
      p.out.send(Op.S_SKILLS_UPDATE, { skills: this.w.skillsOf(p), cls });
      sendStats(p, p.full(this.w.now));
      p.zone?.respawnLook(p);
      this.w.log("class", { player: p.id, cls, first });
      if (first) await this.ceremonyDone(p, refSeq);
    } catch (e) {
      p.store.onError(p, "chooseClass", e);
      fail(p, ErrorCode.E_INTERNAL, refSeq, "SAVE_FAILED");
    }
  }

  private async ceremonyDone(p: Player, refSeq: number): Promise<void> {
    const q = this.current(p);
    if (q?.id !== "Q_MAIN_12") return;
    this.event(p, "REACH", "I001");
    if (this.status(p, q) !== "READY") return;
    if (!(await this.turnIn(p, q, null, refSeq))) return;
    const sc = this.scene(p, "Q_MAIN_12");
    const k = this.c.classes.get(p.cls!)!;
    const played = p.playedBefore + Math.round((Date.now() - p.sessionStart) / 1000);
    sc.chapterEnd = {
      letter: this.c.text(this.c.scenes.get("Q_MAIN_12")!.letterKey ?? ""),
      minutes: Math.round(played / 60),
      lv: p.lv,
      power: p.full(this.w.now).power,
      className: this.c.text(k.nameKey),
    };
    p.out.send(Op.S_SCENE, sc);
  }

  /* ---------------- map objects: quest herbs ---------------- */
  /** C_USE_OBJECT HERB:n (quests §4.1): only for players who need the herb, grows back after 20 s. */
  gather(p: Player, objectId: string, refSeq: number): void {
    const i = Number(objectId.slice(5));
    for (const [item, src] of Object.entries(this.c.questItems)) {
      if (!("node" in src) || p.zone?.mapId !== src.node) continue;
      const col = src.cols[i];
      if (col === undefined || !Number.isInteger(i)) break;
      if (!this.needs(p, item)) return fail(p, ErrorCode.E_INVALID_TARGET, refSeq, "NOT_NEEDED");
      const x = col * 32 + 16;
      if (Math.abs(p.body.x - x) > OBJECT_RANGE + RULES.rangeTolerance)
        return fail(p, ErrorCode.E_OUT_OF_RANGE, refSeq, "TOO_FAR");
      const now = this.w.clock();
      if ((p.herbs.get(objectId) ?? 0) > now) return fail(p, ErrorCode.E_COOLDOWN, refSeq, "NOT_GROWN");
      p.herbs.set(objectId, now + src.respawnSec * 1000);
      this.event(p, "COLLECT", item);
      return;
    }
    fail(p, ErrorCode.E_INVALID_TARGET, refSeq, "NO_OBJECT");
  }

  /** A monster died and gave this player a share: KILL credit and quest item drops (quests §4.1). */
  onKill(p: Player, mobId: string): void {
    this.event(p, "KILL", mobId);
    for (const [item, src] of Object.entries(this.c.questItems))
      if ("mob" in src && src.mob === mobId && this.needs(p, item) && this.w.rng() < src.chance)
        this.event(p, "COLLECT", item);
  }
}

/** Summaries of `count` × item for reward lists. */
function p0Summary(w: World, id: string, count: number) {
  const def = w.content.items.get(id);
  return [
    {
      kind: def?.slot ? ("gear" as const) : ("item" as const),
      item: id,
      name: def ? w.content.text(def.nameKey) : id,
      icon: def?.icon.replace(/^items\//, ""),
      qty: count,
      ...(def?.slot ? { level: def.levelReq ?? 1, rarity: def.rarity ?? "common" } : {}),
    },
  ];
}

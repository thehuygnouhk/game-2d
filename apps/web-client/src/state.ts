import type {
  Appearance,
  BagItem,
  ClassId,
  Equipment,
  MapInfo,
  NpcInfo,
  SBossState,
  SEnterWorld,
  SInstanceState,
  SInventoryDelta,
  SkillInfo,
  SQuestUpdate,
  SStatsUpdate,
  StatsFull,
} from "@htk/shared";

/** What the client knows about its own character; the HUD redraws from it (client-design §3). */
export class GameState {
  readonly you: number;
  readonly name: string;
  readonly appearance: Appearance;
  cls: ClassId | null;
  stats: StatsFull;
  skills: SkillInfo[];
  bag: { soft: number; items: BagItem[]; size: number };
  equipment: Equipment;
  quests: SQuestUpdate;
  map: MapInfo;
  npcs: NpcInfo[];
  /** dungeon or ceremony hall the player is in (step B4) */
  instance: SInstanceState | null = null;
  /** boss bar */
  boss: SBossState | null = null;
  /** local ready time (performance.now) of each skill and potion group, for the cooldown display */
  readonly ready = new Map<string, number>();
  dead = false;
  deathLoss = 0;
  rallyUntil = 0;
  private readonly listeners = new Set<() => void>();

  constructor(e: SEnterWorld) {
    this.you = e.you;
    this.name = e.character.name;
    this.appearance = e.character.appearance;
    this.cls = e.character.cls;
    this.stats = e.stats;
    this.skills = e.skills;
    this.bag = { ...e.bag, items: [...e.bag.items] };
    this.equipment = { ...e.equipment };
    this.quests = e.quests;
    this.map = e.map;
    this.npcs = e.npcs;
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
  changed(): void {
    for (const fn of this.listeners) fn();
  }

  applyStats(s: SStatsUpdate): void {
    const { rallyMs, ...rest } = s;
    Object.assign(this.stats, rest);
    if (rallyMs) this.rallyUntil = performance.now() + rallyMs;
    this.changed();
  }

  applyInventory(d: SInventoryDelta): void {
    this.bag.soft = d.soft;
    this.bag.items = this.bag.items.filter((i) => !d.remove.includes(i.instanceId));
    for (const it of d.add) this.bag.items.push(it);
    for (const u of d.update) {
      const it = this.bag.items.find((i) => i.instanceId === u.instanceId);
      if (it) it.qty = u.qty;
    }
    for (const [slot, it] of Object.entries(d.equip ?? {})) {
      if (it) this.equipment[slot as keyof Equipment] = it;
      else delete this.equipment[slot as keyof Equipment];
    }
    this.changed();
  }

  skill(id: string): SkillInfo | undefined {
    return this.skills.find((s) => s.id === id);
  }

  /** first potion of a kind: the biggest heal first when HP is low, like the prototype */
  potion(kind: "hp" | "mp"): BagItem | undefined {
    const list = this.bag.items.filter((i) => (kind === "hp" ? i.healHp : i.healMp));
    const missing = kind === "hp" ? this.stats.maxHp - this.stats.hp : this.stats.maxMp - this.stats.mp;
    const heal = (i: BagItem) => (kind === "hp" ? i.healHp! : i.healMp!);
    list.sort((a, b) => heal(a) - heal(b));
    return list.find((i) => heal(i) >= missing) ?? list[list.length - 1];
  }

  potionCount(kind: "hp" | "mp"): number {
    return this.bag.items.filter((i) => (kind === "hp" ? i.healHp : i.healMp)).reduce((n, i) => n + i.qty, 0);
  }

  /** NPC quest mark (ui-ux §3.1): "!" to accept or talk, "?" to turn in; dim when not ready yet */
  npcMark(id: string): { mark: "!" | "?"; dim: boolean } | null {
    const q = this.quests.main;
    if (!q) return null;
    if (q.status === "AVAILABLE" && q.giver.id === id) return { mark: "!", dim: false };
    if (q.status === "LOCKED" && q.giver.id === id) return { mark: "!", dim: true };
    if (q.status === "READY" && q.turnIn.id === id) return { mark: "?", dim: false };
    if (q.status === "ACTIVE") {
      if (q.objectives.some((o) => o.type === "TALK" && o.target === id && o.got < o.count && o.map === this.map.id))
        return { mark: "!", dim: false };
      if (q.turnIn.id === id) return { mark: "?", dim: true };
    }
    return null;
  }
}

import {
  addSoft,
  BagFullError,
  consumeOne,
  type Db,
  equipItem,
  grantEquipped,
  grantItem,
  type ItemRow,
  ledgerHas,
  lockCharacter,
  type PointSpend,
  type QuestRow,
  saveCharacterState,
  saveLevelUp,
  saveQuest,
  setClass,
  spendPoints,
  takeItem,
  tx,
  unequipItem,
} from "@htk/db";
import {
  type BagItem,
  type ClassId,
  GEAR_SLOTS,
  type GearRarity,
  type GearSlot,
  type Loot,
  RULES,
  type SInventoryDelta,
} from "@htk/shared";
import { mergeDeltas, RARITY_CODE } from "./bag";
import type { Player } from "./entities";

/**
 * One asset change: items in, items out, Quan in or out, and what goes with it (a quest completed, a class
 * chosen, an item worn at once). PgStore writes it in ONE transaction with a ledger row (CLAUDE.md rule 5).
 */
export interface Grant {
  loots?: Loot[];
  /** Quan: positive in, negative out (refused below zero) */
  soft?: number;
  reason: string;
  /** one move of Quan per key, ever (database-schema §6) */
  idemKey?: string;
  /** a bag item going out (sold) */
  take?: { instanceId: string; qty: number };
  /** quest row written with the rewards; refused when the quest is already COMPLETED */
  quest?: QuestRow;
  /** an item created straight in an equipment slot */
  wear?: { templateId: string; slot: GearSlot; level: number; rarity: GearRarity; bound?: boolean };
  cls?: ClassId;
}
export type GrantResult = SInventoryDelta | "BAG_FULL" | "NO_SOFT" | "DUPLICATE" | "GONE";

/**
 * Where a player's progress and assets live (server-design §7-8).
 * - PgStore (accounts, step B3): money and items change in one transaction with a ledger row and an idemKey,
 *   written before memory changes and before the client hears about it (CLAUDE.md rule 5).
 * - MemoryStore (DEV_GUEST only): the in-memory bag, nothing is saved.
 */
export interface Store {
  readonly persistent: boolean;
  /** null: the bag is full */
  pickup(p: Player, loot: Loot, idemKey: string): Promise<SInventoryDelta | null>;
  /** null: no such item */
  consume(p: Player, instanceId: string): Promise<{ item: BagItem; delta: SInventoryDelta } | null>;
  spend(p: Player, pts: PointSpend): Promise<boolean>;
  levelUp(p: Player): Promise<void>;
  grant(p: Player, g: Grant): Promise<GrantResult>;
  /** wear a bag item; null when it is not in the bag */
  equip(p: Player, instanceId: string, slot: GearSlot): Promise<SInventoryDelta | null>;
  /** take off; "BAG_FULL" when there is no room, null when nothing is worn */
  unequip(p: Player, slot: GearSlot): Promise<SInventoryDelta | "BAG_FULL" | null>;
  /** accepted quests and their progress (server-design §8: written on every state change) */
  saveQuest(p: Player, row: QuestRow): Promise<void>;
  /** write-behind of position, HP, MP, EXP (server-design §8) */
  save(p: Player): Promise<void>;
  /** log a failed asset operation (the caller tells the player) */
  onError(p: Player, op: string, e: unknown): void;
}

type Log = (event: string, data?: Record<string, unknown>) => void;

export class MemoryStore implements Store {
  readonly persistent = false;
  constructor(private readonly log: Log = () => {}) {}
  onError(p: Player, op: string, e: unknown): void {
    this.log("store.error", { op, player: p.id, message: (e as Error).message });
  }
  async pickup(p: Player, loot: Loot): Promise<SInventoryDelta | null> {
    return p.bag.add(loot);
  }
  async consume(p: Player, instanceId: string) {
    return p.bag.takeOne(instanceId);
  }
  async spend(): Promise<boolean> {
    return true;
  }
  async levelUp(): Promise<void> {}
  async grant(p: Player, g: Grant): Promise<GrantResult> {
    const bag = p.bag;
    const snap = bag.snapshot();
    if (g.quest && p.quests.get(g.quest.quest_id)?.status === "COMPLETED") return "DUPLICATE";
    if ((g.soft ?? 0) < 0 && bag.soft < -(g.soft ?? 0)) return "NO_SOFT";
    const ds: SInventoryDelta[] = [];
    if (g.take) {
      const t = bag.take(g.take.instanceId, g.take.qty);
      if (!t) return "GONE";
      ds.push(t.delta);
    }
    for (const l of g.loots ?? []) {
      const d = bag.add(l);
      if (!d) {
        bag.restore(snap);
        return "BAG_FULL";
      }
      ds.push(d);
    }
    if (g.wear) ds.push(bag.wearNew(g.wear.templateId, g.wear.slot, g.wear.level, g.wear.rarity));
    bag.soft += g.soft ?? 0;
    return mergeDeltas(ds, bag.soft);
  }
  async equip(p: Player, instanceId: string): Promise<SInventoryDelta | null> {
    return p.bag.wear(instanceId);
  }
  async unequip(p: Player, slot: GearSlot): Promise<SInventoryDelta | "BAG_FULL" | null> {
    if (!p.bag.equip[slot]) return null;
    return p.bag.takeOff(slot) ?? "BAG_FULL";
  }
  async saveQuest(): Promise<void> {}
  async save(): Promise<void> {}
}

export class PgStore implements Store {
  readonly persistent = true;
  constructor(
    private readonly db: Db,
    private readonly log: Log = () => {},
  ) {}
  onError(p: Player, op: string, e: unknown): void {
    this.log("store.error", { op, character: p.characterId, message: (e as Error).message });
  }

  private grantLoot(t: Parameters<typeof grantItem>[0], p: Player, l: Exclude<Loot, { kind: "soft" }>) {
    const def = p.bag.contentItem(l.item);
    return grantItem(t, p.characterId!, {
      templateId: l.item,
      qty: l.kind === "gear" ? 1 : l.qty,
      stack: def?.stack,
      rarity: l.kind === "gear" ? RARITY_CODE[l.rarity] : 0,
      itemLevel: l.kind === "gear" ? l.level : 1,
      affixes: l.kind === "gear" ? l.affixes : [],
      bagSize: RULES.bagSize,
    });
  }

  async pickup(p: Player, loot: Loot, idemKey: string): Promise<SInventoryDelta | null> {
    const id = p.characterId!;
    try {
      const res = await tx(this.db, async (t) => {
        const c = await lockCharacter(t, id);
        if (loot.kind === "soft") {
          const r = await addSoft(t, id, loot.qty, "MOB_DROP", { type: "DROP", id: idemKey }, idemKey);
          return { rows: [] as ItemRow[], soft: r.balance };
        }
        return { rows: await this.grantLoot(t, p, loot), soft: c.soft_currency };
      });
      return p.bag.applyRows(res.rows, res.soft, p.bag.summary(loot));
    } catch (e) {
      if (e instanceof BagFullError) return null;
      throw e;
    }
  }

  async consume(p: Player, instanceId: string) {
    const id = p.characterId!;
    const before = p.bag.items.find((i) => i.instanceId === instanceId);
    const row = await tx(this.db, async (t) => {
      await lockCharacter(t, id);
      return consumeOne(t, id, instanceId);
    });
    if (!row || !before) return null;
    const item = { ...before };
    return { item, delta: p.bag.applyRows([row], p.bag.soft) };
  }

  async grant(p: Player, g: Grant): Promise<GrantResult> {
    const id = p.characterId!;
    try {
      const res = await tx(
        this.db,
        async (t): Promise<{ rows: ItemRow[]; soft: number } | Exclude<GrantResult, SInventoryDelta>> => {
          const c = await lockCharacter(t, id);
          if (g.idemKey && (await ledgerHas(t, id, g.idemKey))) return "DUPLICATE";
          const soft = g.soft ?? 0;
          if (soft < 0 && c.soft_currency < -soft) return "NO_SOFT";
          if (g.quest && !(await saveQuest(t, id, g.quest))) return "DUPLICATE";
          const rows: ItemRow[] = [];
          if (g.take) {
            const r = await takeItem(t, id, g.take.instanceId, g.take.qty);
            if (!r) throw new GoneError();
            rows.push(r);
          }
          for (const l of g.loots ?? []) if (l.kind !== "soft") rows.push(...(await this.grantLoot(t, p, l)));
          if (g.wear)
            rows.push(
              await grantEquipped(t, id, {
                templateId: g.wear.templateId,
                slot: GEAR_SLOTS.indexOf(g.wear.slot),
                rarity: RARITY_CODE[g.wear.rarity],
                itemLevel: g.wear.level,
                bound: g.wear.bound,
              }),
            );
          if (g.cls) await setClass(t, id, g.cls);
          let balance = c.soft_currency;
          if (soft)
            balance = (await addSoft(t, id, soft, g.reason, { type: g.reason, id: g.idemKey ?? "" }, g.idemKey))
              .balance;
          return { rows, soft: balance };
        },
      );
      if (typeof res === "string") return res;
      return p.bag.applyRows(res.rows, res.soft);
    } catch (e) {
      if (e instanceof BagFullError) return "BAG_FULL";
      if (e instanceof GoneError) return "GONE";
      throw e;
    }
  }

  async equip(p: Player, instanceId: string, slot: GearSlot): Promise<SInventoryDelta | null> {
    const id = p.characterId!;
    const rows = await tx(this.db, async (t) => {
      await lockCharacter(t, id);
      return equipItem(t, id, instanceId, GEAR_SLOTS.indexOf(slot));
    });
    return rows.length ? p.bag.applyRows(rows, p.bag.soft) : null;
  }

  async unequip(p: Player, slot: GearSlot): Promise<SInventoryDelta | "BAG_FULL" | null> {
    const id = p.characterId!;
    try {
      const row = await tx(this.db, async (t) => {
        await lockCharacter(t, id);
        return unequipItem(t, id, GEAR_SLOTS.indexOf(slot), RULES.bagSize);
      });
      return row ? p.bag.applyRows([row], p.bag.soft) : null;
    } catch (e) {
      if (e instanceof BagFullError) return "BAG_FULL";
      throw e;
    }
  }

  async saveQuest(p: Player, row: QuestRow): Promise<void> {
    await saveQuest(this.db, p.characterId!, row);
  }

  async spend(p: Player, pts: PointSpend): Promise<boolean> {
    return !!(await spendPoints(this.db, p.characterId!, pts));
  }

  async levelUp(p: Player): Promise<void> {
    await saveLevelUp(this.db, p.characterId!, p.lv, p.exp, p.pendingPoints);
    p.pendingPoints = 0;
  }

  async save(p: Player): Promise<void> {
    const z = p.zone ?? p.lastZone;
    const now = Date.now();
    const played = Math.max(0, Math.round((now - p.playMark) / 1000));
    p.playMark = now;
    // inside a dungeon or the ceremony hall the character is saved at the way out (instances are not kept)
    const at = z?.inst ? z.inst.entry : z ? { mapId: z.mapId, x: p.body.x, y: p.body.y } : null;
    await saveCharacterState(this.db, p.characterId!, {
      level: p.lv,
      exp: p.exp,
      hp: p.alive ? p.hp : p.stats.hp, // a fallen player comes back full in town (combat §7)
      mp: p.mp,
      mapId: p.alive ? (at?.mapId ?? "M001") : (p.townMap ?? "M001"),
      x: p.alive && at ? at.x : -1,
      y: p.alive && at ? at.y : -1,
      playSeconds: played,
    });
    const active = p.activeQuestRow();
    if (active && p.questDirty) {
      p.questDirty = false;
      await saveQuest(this.db, p.characterId!, active);
    }
  }
}

class GoneError extends Error {}

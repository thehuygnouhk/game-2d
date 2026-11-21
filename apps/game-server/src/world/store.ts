import {
  addSoft,
  BagFullError,
  consumeOne,
  type Db,
  grantItem,
  type ItemRow,
  lockCharacter,
  type PointSpend,
  saveCharacterState,
  saveLevelUp,
  spendPoints,
  tx,
} from "@htk/db";
import { type BagItem, type Loot, RULES, type SInventoryDelta } from "@htk/shared";
import { RARITY_CODE } from "./bag";
import type { Player } from "./entities";

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

  async pickup(p: Player, loot: Loot, idemKey: string): Promise<SInventoryDelta | null> {
    const id = p.characterId!;
    try {
      const res = await tx(this.db, async (t) => {
        const c = await lockCharacter(t, id);
        if (loot.kind === "soft") {
          const r = await addSoft(t, id, loot.qty, "MOB_DROP", { type: "DROP", id: idemKey }, idemKey);
          return { rows: [] as ItemRow[], soft: r.balance };
        }
        const def = p.bag.contentItem(loot.item);
        const rows = await grantItem(t, id, {
          templateId: loot.item,
          qty: loot.kind === "gear" ? 1 : loot.qty,
          stack: def?.stack,
          rarity: loot.kind === "gear" ? RARITY_CODE[loot.rarity] : 0,
          itemLevel: loot.kind === "gear" ? loot.level : 1,
          bagSize: RULES.bagSize,
        });
        return { rows, soft: c.soft_currency };
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
    await saveCharacterState(this.db, p.characterId!, {
      level: p.lv,
      exp: p.exp,
      hp: p.alive ? p.hp : p.stats.hp, // a fallen player comes back full in town (combat §7)
      mp: p.mp,
      mapId: p.alive ? (z?.mapId ?? "M001") : (p.townMap ?? "M001"),
      x: p.alive ? p.body.x : -1,
      y: p.alive ? p.body.y : -1,
      playSeconds: played,
    });
  }
}

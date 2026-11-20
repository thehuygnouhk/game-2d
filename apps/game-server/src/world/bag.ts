import type { Content } from "@htk/content";
import { type BagItem, type ItemSummary, type Loot, RULES, type SInventoryDelta } from "@htk/shared";

/**
 * Session bag for step B2: what a guest picked up during this connection.
 * It is NOT an asset store: nothing is saved and it is gone on disconnect. Step B3 replaces it with the
 * inventory in PostgreSQL, where every change runs in a transaction with an idemKey and a ledger row
 * (CLAUDE.md rule 5, database-schema §6).
 */
export class Bag {
  soft = 0;
  readonly items: BagItem[] = [];
  private next = 1;

  constructor(
    private readonly content: Content,
    readonly size: number = RULES.bagSize,
  ) {}

  summary(l: Loot): ItemSummary {
    if (l.kind === "soft") return { kind: "soft", name: "Quan", icon: "quan", qty: l.qty };
    const def = this.content.items.get(l.item);
    const base = {
      item: l.item,
      name: def ? this.content.text(def.nameKey) : l.item,
      icon: def?.icon.replace(/^items\//, ""),
    };
    return l.kind === "gear"
      ? { kind: "gear", ...base, qty: 1, level: l.level, rarity: l.rarity }
      : { kind: "item", ...base, qty: l.qty };
  }

  /** Add a picked-up drop. Returns the delta to send, or null when the bag is full. */
  add(l: Loot): SInventoryDelta | null {
    const picked = this.summary(l);
    if (l.kind === "soft") {
      this.soft += l.qty;
      return { soft: this.soft, add: [], update: [], remove: [], picked };
    }
    const def = this.content.items.get(l.item);
    if (l.kind === "item" && def?.stack) {
      const same = this.items.find((i) => i.item === l.item && i.qty < (def.stack ?? 1));
      if (same) {
        same.qty = Math.min(def.stack, same.qty + l.qty);
        return {
          soft: this.soft,
          add: [],
          update: [{ instanceId: same.instanceId, qty: same.qty }],
          remove: [],
          picked,
        };
      }
    }
    if (this.items.length >= this.size) return null;
    const it: BagItem = { instanceId: `b${this.next++}`, ...picked };
    if (def?.healHp) it.healHp = def.healHp;
    if (def?.healMp) it.healMp = def.healMp;
    this.items.push(it);
    return { soft: this.soft, add: [it], update: [], remove: [], picked };
  }

  /** Take one unit of a bag entry. */
  takeOne(instanceId: string): { item: BagItem; delta: SInventoryDelta } | null {
    const i = this.items.findIndex((x) => x.instanceId === instanceId);
    if (i < 0) return null;
    const it = this.items[i]!;
    it.qty--;
    if (it.qty > 0)
      return { item: it, delta: { soft: this.soft, add: [], update: [{ instanceId, qty: it.qty }], remove: [] } };
    this.items.splice(i, 1);
    return { item: it, delta: { soft: this.soft, add: [], update: [], remove: [instanceId] } };
  }
}

import type { Content } from "@htk/content";
import type { ItemRow } from "@htk/db";
import { type BagItem, type GearRarity, type ItemSummary, type Loot, RULES, type SInventoryDelta } from "@htk/shared";

/** item_instances.rarity (database-schema §4.3, items §2): 0 Thường, 1 Tốt, 2 Hiếm, 3 Sử Thi. */
export const RARITY_CODE: Record<GearRarity, number> = { common: 0, good: 1, rare: 2, epic: 3 };
const RARITY_OF: GearRarity[] = ["common", "good", "rare", "epic"];

/**
 * The bag of a player in memory.
 * - Accounts (step B3): a mirror of item_instances and soft_currency. It only changes after the database
 *   transaction committed (store.ts), never before.
 * - Development guests (DEV_GUEST): the bag itself, gone on disconnect.
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

  contentItem(id: string) {
    return this.content.items.get(id);
  }

  /** A bag entry from a database row. */
  fromRow(r: ItemRow): BagItem {
    const def = this.content.items.get(r.template_id);
    const gear = def?.type === "WEAPON" || def?.type === "ARMOR" || def?.type === "TOME";
    const it: BagItem = {
      instanceId: r.id,
      kind: gear ? "gear" : "item",
      item: r.template_id,
      name: def ? this.content.text(def.nameKey) : r.template_id,
      icon: def?.icon.replace(/^items\//, ""),
      qty: r.qty,
    };
    if (gear) {
      it.level = r.item_level;
      it.rarity = RARITY_OF[r.rarity] ?? "common";
    }
    if (def?.healHp) it.healHp = def.healHp;
    if (def?.healMp) it.healMp = def.healMp;
    return it;
  }

  /** Replace the content with database rows (loading a character). */
  load(soft: number, rows: ItemRow[]): void {
    this.soft = soft;
    this.items.length = 0;
    for (const r of rows) this.items.push(this.fromRow(r));
  }

  /** Mirror rows written by a committed transaction; returns the delta for the client. */
  applyRows(rows: ItemRow[], soft: number, picked?: ItemSummary): SInventoryDelta {
    this.soft = soft;
    const d: SInventoryDelta = { soft, add: [], update: [], remove: [] };
    if (picked) d.picked = picked;
    for (const r of rows) {
      const i = this.items.findIndex((x) => x.instanceId === r.id);
      if (r.qty <= 0) {
        if (i >= 0) this.items.splice(i, 1);
        d.remove.push(r.id);
      } else if (i >= 0) {
        this.items[i]!.qty = r.qty;
        d.update.push({ instanceId: r.id, qty: r.qty });
      } else {
        const it = this.fromRow(r);
        this.items.push(it);
        d.add.push(it);
      }
    }
    return d;
  }

  /** Add a picked-up drop (guests only). Returns the delta to send, or null when the bag is full. */
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

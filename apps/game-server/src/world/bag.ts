import type { Content } from "@htk/content";
import type { ItemRow } from "@htk/db";
import {
  type Affix,
  type BagItem,
  type ClassId,
  type Equipment,
  GEAR_SLOTS,
  type GearRarity,
  type GearSlot,
  gearMain,
  gearValue,
  type ItemSummary,
  type Loot,
  RULES,
  type SInventoryDelta,
  sellPrice,
} from "@htk/shared";

/** item_instances.rarity (database-schema §4.3, items §2): 0 Thường, 1 Tốt, 2 Hiếm, 3 Sử Thi. */
export const RARITY_CODE: Record<GearRarity, number> = { common: 0, good: 1, rare: 2, epic: 3 };
const RARITY_OF: GearRarity[] = ["common", "good", "rare", "epic"];

type Snapshot = { soft: number; items: BagItem[]; equip: Equipment; next: number };

/**
 * The bag and the equipment of a player in memory.
 * - Accounts (step B3): a mirror of item_instances (BAG and EQUIP) and soft_currency. It only changes after the
 *   database transaction committed (store.ts), never before.
 * - Development guests (DEV_GUEST): the bag itself, gone on disconnect.
 */
export class Bag {
  soft = 0;
  items: BagItem[] = [];
  equip: Equipment = {};
  private next = 1;

  constructor(
    private readonly content: Content,
    readonly size: number = RULES.bagSize,
  ) {}

  contentItem(id: string) {
    return this.content.items.get(id);
  }

  /** gear: a slot item (weapon, armor, tome) */
  isGear(id: string): boolean {
    return !!this.content.items.get(id)?.slot;
  }

  /** What a reward of `count` × item id is as loot: named gear takes its own level and rarity. */
  lootOf(id: string, count: number): Loot[] {
    const d = this.content.items.get(id);
    if (!d?.slot) return [{ kind: "item", item: id, qty: count }];
    return Array.from({ length: count }, () => ({
      kind: "gear" as const,
      item: id,
      level: d.levelReq ?? 1,
      rarity: d.rarity ?? "common",
      affixes: [],
    }));
  }

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

  /** Everything the client shows about one bag entry (items §2-4). */
  make(
    instanceId: string,
    templateId: string,
    qty: number,
    level: number,
    rarity: GearRarity,
    affixes: Affix[],
  ): BagItem {
    const def = this.content.items.get(templateId);
    const gear = !!def?.slot;
    const it: BagItem = {
      instanceId,
      kind: gear ? "gear" : "item",
      item: templateId,
      name: def ? this.content.text(def.nameKey) : templateId,
      icon: def?.icon.replace(/^items\//, ""),
      qty,
      type: def?.type,
    };
    if (gear) {
      const slot = def!.slot as GearSlot;
      Object.assign(it, { level, rarity, slot, main: gearMain(slot, level, rarity), affixes });
      if (def!.set) it.set = def!.set;
      if (def!.class) it.cls = def!.class as ClassId;
      if (def!.bind === "BOP") it.bound = true;
      else it.sell = sellPrice(gearValue(level, rarity));
    } else if (def?.value) it.sell = sellPrice(def.value);
    if (def?.healHp) it.healHp = def.healHp;
    if (def?.healMp) it.healMp = def.healMp;
    return it;
  }

  /** A bag entry from a database row. */
  fromRow(r: ItemRow): BagItem {
    return this.make(
      r.id,
      r.template_id,
      r.qty,
      r.item_level,
      RARITY_OF[r.rarity] ?? "common",
      (r.affixes ?? []) as Affix[],
    );
  }

  /** Replace the content with database rows (loading a character). */
  load(soft: number, rows: ItemRow[]): void {
    this.soft = soft;
    this.items = [];
    this.equip = {};
    for (const r of rows) {
      const slot = GEAR_SLOTS[r.slot];
      if (r.location === "EQUIP" && slot) this.equip[slot] = this.fromRow(r);
      else this.items.push(this.fromRow(r));
    }
  }

  private slotOf(id: string): GearSlot | undefined {
    return GEAR_SLOTS.find((s) => this.equip[s]?.instanceId === id);
  }

  /** Mirror rows written by a committed transaction; returns the delta for the client. */
  applyRows(rows: ItemRow[], soft: number, picked?: ItemSummary): SInventoryDelta {
    this.soft = soft;
    const d: SInventoryDelta = { soft, add: [], update: [], remove: [] };
    if (picked) d.picked = picked;
    const eq = (s: GearSlot, v: BagItem | null) => ((d.equip ??= {})[s] = v);
    for (const r of rows) {
      const i = this.items.findIndex((x) => x.instanceId === r.id);
      const worn = this.slotOf(r.id);
      if (r.qty <= 0) {
        if (i >= 0) {
          this.items.splice(i, 1);
          d.remove.push(r.id);
        }
        if (worn) {
          delete this.equip[worn];
          eq(worn, null);
        }
      } else if (r.location === "EQUIP") {
        const s = GEAR_SLOTS[r.slot]!;
        if (i >= 0) {
          this.items.splice(i, 1);
          d.remove.push(r.id);
        }
        if (worn && worn !== s) {
          delete this.equip[worn];
          eq(worn, null);
        }
        const it = this.fromRow(r);
        this.equip[s] = it;
        eq(s, it);
      } else {
        if (worn) {
          delete this.equip[worn];
          eq(worn, null);
        }
        if (i >= 0) {
          this.items[i]!.qty = r.qty;
          d.update.push({ instanceId: r.id, qty: r.qty });
        } else {
          const it = this.fromRow(r);
          this.items.push(it);
          d.add.push(it);
        }
      }
    }
    return d;
  }

  /* ---------------- development guests: the bag itself ---------------- */
  snapshot(): Snapshot {
    return structuredClone({ soft: this.soft, items: this.items, equip: this.equip, next: this.next });
  }
  restore(s: Snapshot): void {
    Object.assign(this, structuredClone(s));
  }

  /** Add a picked-up drop or a reward (guests only). Returns the delta, or null when the bag is full. */
  add(l: Loot): SInventoryDelta | null {
    const picked = this.summary(l);
    if (l.kind === "soft") {
      this.soft += l.qty;
      return { soft: this.soft, add: [], update: [], remove: [], picked };
    }
    const def = this.content.items.get(l.item);
    if (l.kind === "item" && def?.stack) {
      const same = this.items.find((i) => i.item === l.item && i.qty < (def.stack ?? 1));
      if (same && same.qty + l.qty <= def.stack) {
        same.qty += l.qty;
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
    const it =
      l.kind === "gear"
        ? this.make(`b${this.next++}`, l.item, 1, l.level, l.rarity, l.affixes)
        : this.make(`b${this.next++}`, l.item, l.qty, 1, "common", []);
    this.items.push(it);
    return { soft: this.soft, add: [it], update: [], remove: [], picked };
  }

  /** Take `qty` units of a bag entry (guests). */
  take(instanceId: string, qty = 1): { item: BagItem; delta: SInventoryDelta } | null {
    const i = this.items.findIndex((x) => x.instanceId === instanceId);
    if (i < 0 || this.items[i]!.qty < qty) return null;
    const it = this.items[i]!;
    it.qty -= qty;
    if (it.qty > 0)
      return { item: it, delta: { soft: this.soft, add: [], update: [{ instanceId, qty: it.qty }], remove: [] } };
    this.items.splice(i, 1);
    return { item: it, delta: { soft: this.soft, add: [], update: [], remove: [instanceId] } };
  }
  takeOne(instanceId: string) {
    return this.take(instanceId, 1);
  }

  /** Wear a bag item (guests); what was worn takes its place in the bag. */
  wear(instanceId: string): SInventoryDelta | null {
    const i = this.items.findIndex((x) => x.instanceId === instanceId);
    const it = this.items[i];
    if (!it?.slot) return null;
    const old = this.equip[it.slot];
    const d: SInventoryDelta = {
      soft: this.soft,
      add: [],
      update: [],
      remove: [it.instanceId],
      equip: { [it.slot]: it },
    };
    if (old) {
      this.items[i] = old;
      d.add.push(old);
    } else this.items.splice(i, 1);
    this.equip[it.slot] = it;
    return d;
  }

  /** Take off (guests); null when the bag is full or nothing is worn. */
  takeOff(slot: GearSlot): SInventoryDelta | null {
    const it = this.equip[slot];
    if (!it || this.items.length >= this.size) return null;
    delete this.equip[slot];
    this.items.push(it);
    return { soft: this.soft, add: [it], update: [], remove: [], equip: { [slot]: null } };
  }

  /** Put an item straight into a slot (guests: the Huyền Thư of the ceremony). */
  wearNew(templateId: string, slot: GearSlot, level: number, rarity: GearRarity): SInventoryDelta {
    const it = this.make(`b${this.next++}`, templateId, 1, level, rarity, []);
    this.equip[slot] = it;
    return { soft: this.soft, add: [], update: [], remove: [], equip: { [slot]: it } };
  }

  /** every item of this template, worn or not */
  owns(templateId: string): boolean {
    return [...this.items, ...Object.values(this.equip)].some((i) => i?.item === templateId);
  }
}

/** Merge several deltas into one, in order. */
export function mergeDeltas(ds: SInventoryDelta[], soft: number): SInventoryDelta {
  const out: SInventoryDelta = { soft, add: [], update: [], remove: [] };
  for (const d of ds) {
    for (const r of d.remove) {
      out.add = out.add.filter((a) => a.instanceId !== r);
      out.update = out.update.filter((u) => u.instanceId !== r);
      out.remove.push(r);
    }
    for (const u of d.update) {
      const a = out.add.find((x) => x.instanceId === u.instanceId);
      if (a) a.qty = u.qty;
      else {
        out.update = out.update.filter((x) => x.instanceId !== u.instanceId);
        out.update.push(u);
      }
    }
    for (const a of d.add) {
      out.remove = out.remove.filter((r) => r !== a.instanceId);
      out.add.push(a);
    }
    if (d.equip) out.equip = { ...out.equip, ...d.equip };
  }
  return out;
}

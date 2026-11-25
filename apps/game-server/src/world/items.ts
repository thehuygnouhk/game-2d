import {
  ErrorCode,
  GEAR_SLOTS,
  type GearSlot,
  type Loot,
  NPC_RANGE,
  OBJECT_RANGE,
  Op,
  RULES,
  rollAffixes,
  type SInventoryDelta,
} from "@htk/shared";
import { fail, sendStats } from "./combat";
import type { Player } from "./entities";
import { stableUuid } from "./quests";
import type { GrantResult } from "./store";
import type { World } from "./world";

/** Equipment, Lam Nhi's shop and the dungeon chest on the server (items §3, economy §3, maps §6.2). */

function afterGear(p: Player, d: SInventoryDelta, w: World): void {
  p.out.send(Op.S_INVENTORY_DELTA, d);
  p.recompute();
  sendStats(p, p.full(w.now));
}

/** C_EQUIP: level and class of the item are checked (items §3). */
export function equip(w: World, p: Player, instanceId: string, refSeq: number): void {
  const it = p.bag.items.find((i) => i.instanceId === instanceId);
  if (!it) return fail(p, ErrorCode.E_ITEM_NOT_FOUND, refSeq, "NO_ITEM");
  if (!it.slot) return fail(p, ErrorCode.E_INVALID_TARGET, refSeq, "NOT_GEAR");
  if (p.lv < (it.level ?? 1)) return fail(p, ErrorCode.E_LEVEL_REQUIRED, refSeq, `LEVEL_${it.level}`);
  if (it.cls && it.cls !== p.cls) return fail(p, ErrorCode.E_INVALID_TARGET, refSeq, `CLASS_${it.cls}`);
  void p
    .enqueue(() => p.store.equip(p, instanceId, it.slot!))
    .then((d) => (d ? afterGear(p, d, w) : fail(p, ErrorCode.E_ITEM_NOT_FOUND, refSeq, "NO_ITEM")))
    .catch((e) => {
      p.store.onError(p, "equip", e);
      fail(p, ErrorCode.E_INTERNAL, refSeq, "SAVE_FAILED");
    });
}

/** C_UNEQUIP: needs a free bag slot; the Huyền Thư stays on (items §3). */
export function unequip(w: World, p: Player, slot: GearSlot, refSeq: number): void {
  const it = p.bag.equip[slot];
  if (!it) return fail(p, ErrorCode.E_ITEM_NOT_FOUND, refSeq, "NOTHING_WORN");
  if (it.bound) return fail(p, ErrorCode.E_ITEM_BOUND, refSeq, "BOUND");
  void p
    .enqueue(() => p.store.unequip(p, slot))
    .then((d) => {
      if (d === "BAG_FULL") return fail(p, ErrorCode.E_INVENTORY_FULL, refSeq, "BAG_FULL");
      if (!d) return fail(p, ErrorCode.E_ITEM_NOT_FOUND, refSeq, "NOTHING_WORN");
      afterGear(p, d, w);
    })
    .catch((e) => {
      p.store.onError(p, "unequip", e);
      fail(p, ErrorCode.E_INTERNAL, refSeq, "SAVE_FAILED");
    });
}

function result(p: Player, r: GrantResult, refSeq: number): r is SInventoryDelta {
  if (r === "BAG_FULL") fail(p, ErrorCode.E_INVENTORY_FULL, refSeq, "BAG_FULL");
  else if (r === "NO_SOFT") fail(p, ErrorCode.E_NOT_ENOUGH_SOFT, refSeq, "NOT_ENOUGH_SOFT");
  else if (r === "DUPLICATE") fail(p, ErrorCode.E_DUPLICATE_REQUEST, refSeq, "DUPLICATE");
  else if (r === "GONE") fail(p, ErrorCode.E_ITEM_NOT_FOUND, refSeq, "NO_ITEM");
  else return true;
  return false;
}

/** The shop NPC stands next to the player (shops follow their NPC: Lam Nhi is in M001 and M002). */
function atShop(w: World, p: Player, shopId: string): boolean {
  return w.content.shops.has(shopId) && w.quests.near(p, shopId);
}

/** C_SHOP_BUY (economy §3): Quan out with a ledger row and the items in, one transaction. */
export function buy(
  w: World,
  p: Player,
  shopId: string,
  itemId: string,
  qty: number,
  idemKey: string,
  refSeq: number,
): void {
  if (!atShop(w, p, shopId)) return fail(p, ErrorCode.E_OUT_OF_RANGE, refSeq, "NOT_AT_SHOP");
  const shop = w.content.shops.get(shopId)!;
  const def = w.content.items.get(itemId);
  if (!shop.sells.includes(itemId) || !def?.value) return fail(p, ErrorCode.E_INVALID_TARGET, refSeq, "NOT_SOLD_HERE");
  const cost = def.value * qty;
  if (p.bag.soft < cost) return fail(p, ErrorCode.E_NOT_ENOUGH_SOFT, refSeq, "NOT_ENOUGH_SOFT");
  void p
    .enqueue(() => p.store.grant(p, { loots: p.bag.lootOf(itemId, qty), soft: -cost, reason: "SHOP_BUY", idemKey }))
    .then((r) => {
      if (!result(p, r, refSeq)) return;
      r.gained = [{ ...p.bag.summary({ kind: "item", item: itemId, qty }) }];
      p.out.send(Op.S_INVENTORY_DELTA, r);
      w.log("shop.buy", { player: p.id, item: itemId, qty, cost });
    })
    .catch((e) => {
      p.store.onError(p, "buy", e);
      fail(p, ErrorCode.E_INTERNAL, refSeq, "SAVE_FAILED");
    });
}

/** C_SHOP_SELL (items §4.1): 25% of the value; the Huyền Thư and worn items cannot be sold. */
export function sell(w: World, p: Player, instanceId: string, qty: number, idemKey: string, refSeq: number): void {
  const shopId = [...w.content.shops.keys()].find((id) => w.quests.near(p, id));
  if (!shopId) return fail(p, ErrorCode.E_OUT_OF_RANGE, refSeq, "NOT_AT_SHOP");
  const it = p.bag.items.find((i) => i.instanceId === instanceId);
  if (!it || it.qty < qty) return fail(p, ErrorCode.E_ITEM_NOT_FOUND, refSeq, "NO_ITEM");
  if (!it.sell) return fail(p, ErrorCode.E_ITEM_BOUND, refSeq, "CANNOT_SELL");
  const price = it.sell * qty;
  void p
    .enqueue(() => p.store.grant(p, { take: { instanceId, qty }, soft: price, reason: "SHOP_SELL", idemKey }))
    .then((r) => {
      if (!result(p, r, refSeq)) return;
      p.out.send(Op.S_INVENTORY_DELTA, r);
      w.log("shop.sell", { player: p.id, item: it.item, qty, price });
    })
    .catch((e) => {
      p.store.onError(p, "sell", e);
      fail(p, ErrorCode.E_INTERNAL, refSeq, "SAVE_FAILED");
    });
}

/** C_USE_OBJECT CHEST: Rương Tân Thủ of DG01 (maps §6.2), once per player per run. */
export function openChest(w: World, p: Player, refSeq: number): void {
  const z = p.zone,
    inst = z?.inst,
    dg = inst?.dungeon;
  if (!z || !inst?.chest || !dg) return fail(p, ErrorCode.E_INVALID_TARGET, refSeq, "NO_CHEST");
  if (inst.opened.has(p.id)) return fail(p, ErrorCode.E_INVALID_TARGET, refSeq, "ALREADY_OPENED");
  if (
    Math.abs(p.body.x - inst.chest.x) > OBJECT_RANGE + RULES.rangeTolerance ||
    Math.abs(p.body.y - inst.chest.y) > NPC_RANGE
  )
    return fail(p, ErrorCode.E_OUT_OF_RANGE, refSeq, "TOO_FAR");
  inst.opened.add(p.id);
  const ch = dg.chest,
    rng = w.rng;
  const gearId = ch.gear.items[Math.floor(rng() * ch.gear.items.length)]!;
  const gear: Loot = {
    kind: "gear",
    item: gearId,
    level: ch.gear.level,
    rarity: ch.gear.rarity,
    affixes: rollAffixes(rng, ch.gear.rarity, ch.gear.level),
  };
  const loots = [...ch.items.flatMap((i) => p.bag.lootOf(i.id, i.count)), gear];
  const soft = Math.round(ch.soft * inst.scale.reward);
  const key = stableUuid(p.characterId ?? `guest:${p.name}`, "chest", inst.runId ?? "");
  void p
    .enqueue(() => p.store.grant(p, { loots, soft, reason: "DUNGEON_CHEST", idemKey: key }))
    .then((r) => {
      if (!result(p, r, refSeq)) {
        inst.opened.delete(p.id);
        return;
      }
      r.gained = [{ kind: "soft", name: "Quan", icon: "quan", qty: soft }, ...loots.map((l) => p.bag.summary(l))];
      p.out.send(Op.S_INVENTORY_DELTA, r);
      p.out.send(Op.S_INSTANCE_STATE, z.instanceState(p));
    })
    .catch((e) => {
      inst.opened.delete(p.id);
      p.store.onError(p, "chest", e);
      fail(p, ErrorCode.E_INTERNAL, refSeq, "SAVE_FAILED");
    });
}

export const isGearSlot = (s: string): s is GearSlot => (GEAR_SLOTS as readonly string[]).includes(s);

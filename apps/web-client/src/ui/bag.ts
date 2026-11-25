import { type BagItem, GEAR_SLOTS, type GearSlot, Op, type ShopInfo } from "@htk/shared";
import type { Connection } from "../net/connection";
import type { GameState } from "../state";
import { button, el, fmt, icon, RARITY_NAME, SLOT_NAME } from "./dom";

const TABS: [string, string, (i: BagItem) => boolean][] = [
  ["all", "Tất cả", () => true],
  ["gear", "Trang bị", (i) => i.kind === "gear"],
  ["use", "Tiêu hao", (i) => i.type === "CONSUMABLE"],
  ["mat", "Nguyên liệu", (i) => i.type === "MATERIAL" || i.type === "MISC"],
];
const AFFIX: Record<string, (v: number) => string> = {
  hp: (v) => `+${v} HP`,
  mp: (v) => `+${v} MP`,
  atkP: (v) => `+${Math.round(v * 100)}% ATK`,
  defP: (v) => `+${Math.round(v * 100)}% DEF`,
  crit: (v) => `+${Math.round(v * 100)}% Chí mạng`,
  critDmg: (v) => `+${Math.round(v * 100)}% ST chí mạng`,
};
const MAIN: Record<string, string> = { atk: "ATK", def: "DEF", hp: "HP", mp: "MP" };

/**
 * Hành trang (B, ui-ux §6.1-6.2): equipment slots, the 30-slot bag, item details; in shop mode
 * Lam Nhi's goods and selling at 25% (economy §3). Every action is a request; the server answers with deltas.
 */
export class BagWindow {
  readonly root = el("div", "bagwin");
  private tab = "all";
  private sel: string | null = null;
  private shop: ShopInfo | null = null;
  private confirm: string | null = null;

  constructor(
    stage: HTMLElement,
    private readonly state: GameState,
    private readonly net: Connection,
  ) {
    this.root.hidden = true;
    stage.append(this.root);
    state.subscribe(() => !this.root.hidden && this.render());
  }

  get open(): boolean {
    return !this.root.hidden;
  }
  toggle(force?: boolean): void {
    this.root.hidden = !(force ?? this.root.hidden);
    if (this.root.hidden) this.shop = null;
    this.confirm = null;
    if (!this.root.hidden) this.render();
  }
  openShop(s: ShopInfo): void {
    this.shop = s;
    this.toggle(true);
  }

  private find(id: string | null): { it: BagItem; worn: GearSlot | null } | null {
    if (!id) return null;
    const it = this.state.bag.items.find((i) => i.instanceId === id);
    if (it) return { it, worn: null };
    for (const s of GEAR_SLOTS)
      if (this.state.equipment[s]?.instanceId === id) return { it: this.state.equipment[s]!, worn: s };
    return null;
  }

  private cell(it: BagItem | undefined, onClick: () => void, label?: string): HTMLButtonElement {
    const b = button("", onClick, `cell r-${it?.rarity ?? "common"}${it && it.instanceId === this.sel ? " sel" : ""}`);
    if (it) {
      b.append(icon(it.icon));
      if (it.qty > 1) b.append(el("small", "n", String(it.qty)));
      if (it.level && it.kind === "gear") b.append(el("small", "lv", `Lv${it.level}`));
      b.dataset.item = it.item ?? "";
      b.title = it.name;
    } else if (label) b.append(el("small", "slot", label));
    return b;
  }

  private act(it: BagItem, worn: GearSlot | null): void {
    if (this.shop && !worn) return this.sell(it, false);
    if (worn) this.net.send(Op.C_UNEQUIP, { slot: worn });
    else if (it.kind === "gear") this.net.send(Op.C_EQUIP, { instanceId: it.instanceId });
    else if (it.healHp || it.healMp) this.net.send(Op.C_USE_ITEM, { instanceId: it.instanceId });
  }

  private sell(it: BagItem, all: boolean): void {
    if (!it.sell) return;
    const big = it.rarity === "rare" || it.rarity === "epic";
    if (big && this.confirm !== it.instanceId) {
      this.confirm = it.instanceId;
      return this.render();
    }
    this.confirm = null;
    this.net.send(Op.C_SHOP_SELL, { instanceId: it.instanceId, qty: all ? it.qty : 1, idemKey: crypto.randomUUID() });
  }

  render(): void {
    const st = this.state;
    const head = el("div", "bw-head");
    head.append(
      el("b", "", this.shop ? this.shop.name : "Hành trang"),
      el("span", "soft", `${fmt(st.bag.soft)} Quan`),
      button("×", () => this.toggle(false), "x"),
    );
    // equipment
    const eq = el("div", "bw-eq");
    for (const s of GEAR_SLOTS) {
      const it = st.equipment[s];
      const c = this.cell(it, () => this.pick(it?.instanceId ?? null), SLOT_NAME[s]);
      c.dataset.slot = s;
      eq.append(c);
    }
    const pw = el("div", "bw-pw");
    pw.append(
      el("span", "", `ATK ${st.stats.atk}`),
      el("span", "", `DEF ${st.stats.def}`),
      el("span", "", `HP ${st.stats.maxHp}`),
      el("b", "", `Lực Chiến ${fmt(st.stats.power)}`),
    );
    // bag
    const tabs = el("div", "bw-tabs");
    for (const [k, n] of TABS)
      tabs.append(
        button(
          n,
          () => {
            this.tab = k;
            this.render();
          },
          this.tab === k ? "on" : "",
        ),
      );
    const grid = el("div", "bw-grid");
    const filter = TABS.find((t) => t[0] === this.tab)![2];
    const list = st.bag.items.filter(filter);
    for (let i = 0; i < st.bag.size; i++) {
      const it = list[i];
      grid.append(this.cell(it, () => it && this.pick(it.instanceId)));
    }
    const count = el("small", "bw-count", `${st.bag.items.length}/${st.bag.size} ô`);
    const left = el("div", "bw-left");
    left.append(eq, pw, tabs, grid, count);
    const right = el("div", "bw-right");
    if (this.shop) right.append(this.shopPanel(this.shop));
    right.append(this.detail());
    const body = el("div", "bw-body");
    body.append(left, right);
    this.root.replaceChildren(head, body);
  }

  private pick(id: string | null): void {
    const again = this.sel === id && id;
    this.sel = id;
    this.confirm = null;
    if (again) {
      const f = this.find(id);
      if (f) this.act(f.it, f.worn);
    }
    this.render();
  }

  private shopPanel(s: ShopInfo): HTMLElement {
    const box = el("div", "bw-shop");
    for (const it of s.items) {
      const row = el("div", "srow");
      const name = el("span", "nm");
      name.append(icon(it.icon, "1.8cqw"), el("b", "", it.name));
      if (it.healHp) name.append(el("small", "", ` +${it.healHp} HP`));
      if (it.healMp) name.append(el("small", "", ` +${it.healMp} MP`));
      row.append(name, el("span", "price", `${it.price} Quan`));
      for (const n of [1, 5])
        row.append(
          button(
            `Mua ${n}`,
            () => this.net.send(Op.C_SHOP_BUY, { shopId: s.id, itemId: it.item, qty: n, idemKey: crypto.randomUUID() }),
            "buy",
            this.state.bag.soft < it.price * n,
          ),
        );
      box.append(row);
    }
    return box;
  }

  private detail(): HTMLElement {
    const box = el("div", "bw-detail");
    const f = this.find(this.sel);
    if (!f) {
      box.append(
        el(
          "p",
          "dim",
          this.shop
            ? "Chọn món trong túi để bán (giá 25% giá trị). Nhấn đúp để bán nhanh."
            : "Chọn một món để xem. Nhấn đúp để mặc hoặc dùng.",
        ),
      );
      return box;
    }
    const { it, worn } = f;
    const title = el("div", "idt-head");
    title.append(icon(it.icon, "3cqw"));
    const t = el("div");
    t.append(el("b", `r-${it.rarity ?? "common"}`, it.name));
    const sub = [
      it.kind === "gear"
        ? `${RARITY_NAME[it.rarity ?? "common"]} · ${SLOT_NAME[it.slot ?? ""] ?? ""} · Lv${it.level}`
        : `×${it.qty}`,
      worn ? "đang mặc" : "",
    ].filter(Boolean);
    t.append(el("small", "", sub.join(" · ")));
    title.append(t);
    box.append(title);
    const lines = el("ul", "idt-lines");
    for (const [k, v] of Object.entries(it.main ?? {})) if (MAIN[k]) lines.append(el("li", "", `+${v} ${MAIN[k]}`));
    if (it.main?.spd) lines.append(el("li", "", `+${Math.round(it.main.spd * 100)}% tốc chạy`));
    for (const [k, v] of it.affixes ?? []) lines.append(el("li", "aff", AFFIX[k]?.(v) ?? k));
    if (it.set) lines.append(el("li", "set", "Bộ Dân Làng: 2 món +5% HP · 4 món +8% ATK, DEF"));
    if (it.cls) lines.append(el("li", "cls", `Chỉ ${it.cls === "FIRE" ? "Hỏa Kiếm Sĩ" : "Thủy Pháp Sư"} dùng được`));
    if (it.healHp) lines.append(el("li", "", `Hồi ${it.healHp} HP`));
    if (it.healMp) lines.append(el("li", "", `Hồi ${it.healMp} MP`));
    if (it.bound) lines.append(el("li", "dim", "Gắn với nhân vật: không tháo, không bán"));
    else if (it.sell) lines.append(el("li", "dim", `Bán cho NPC: ${it.sell} Quan`));
    box.append(lines);
    const acts = el("div", "idt-act");
    if (worn && !it.bound) acts.append(button("Tháo", () => this.net.send(Op.C_UNEQUIP, { slot: worn })));
    if (!worn && it.kind === "gear")
      acts.append(
        button(
          "Mặc",
          () => this.net.send(Op.C_EQUIP, { instanceId: it.instanceId }),
          "ok",
          (it.level ?? 1) > this.state.stats.lv || (!!it.cls && it.cls !== this.state.cls),
        ),
      );
    if (!worn && (it.healHp || it.healMp))
      acts.append(button("Dùng", () => this.net.send(Op.C_USE_ITEM, { instanceId: it.instanceId }), "ok"));
    if (this.shop && !worn && it.sell) {
      acts.append(
        button(this.confirm === it.instanceId ? "Bấm lần nữa để bán" : "Bán 1", () => this.sell(it, false), "sell"),
      );
      if (it.qty > 1) acts.append(button(`Bán hết (${it.sell * it.qty} Quan)`, () => this.sell(it, true), "sell"));
    }
    box.append(acts);
    return box;
  }
}

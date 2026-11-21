import { Op, POINT_VALUE, type PointKey, type Points, suggestedPoints } from "@htk/shared";
import type { Connection } from "../net/connection";
import type { GameState } from "../state";

/** Character window: stats and potential points (combat §3.3-3.5, ui-ux §6.1 "Tiềm năng"). */
const ROWS: [PointKey, string, string][] = [
  ["hp", "Máu (HP)", "+30 HP mỗi điểm"],
  ["mp", "Mana (MP)", "+20 MP mỗi điểm"],
  ["atk", "Sức đánh (ATK)", "+3 ATK mỗi điểm"],
  ["def", "Phòng thủ (DEF)", "+2 DEF mỗi điểm"],
  ["crit", "Chí mạng", "+0,05% mỗi điểm"],
];
const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = "", text = ""): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
};
const empty = (): Points => ({ hp: 0, mp: 0, atk: 0, def: 0, crit: 0 });

export class CharWindow {
  readonly root = el("div", "char-win");
  private pend: Points = empty();

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
    this.pend = empty();
    if (!this.root.hidden) this.render();
  }

  private used(): number {
    return this.pend.hp + this.pend.mp + this.pend.atk + this.pend.def + this.pend.crit;
  }

  render(): void {
    const s = this.state.stats,
      free = s.statPoints - this.used();
    const btn = (text: string, on: () => void, disabled: boolean, cls = "") => {
      const b = el("button", cls, text);
      b.type = "button";
      b.disabled = disabled;
      b.addEventListener("click", on);
      return b;
    };
    const head = el("div", "cw-head");
    const close = btn("×", () => this.toggle(false), false, "cw-x");
    close.setAttribute("aria-label", "Đóng");
    head.append(el("b", "", `${this.state.name} · Lv ${s.lv}`), close);
    const sum = el("div", "cw-sum");
    const crit = `${(s.crit * 100).toFixed(2).replace(".", ",")}%`;
    for (const [k, v] of [
      ["HP", `${s.hp}/${s.maxHp}`],
      ["MP", `${s.mp}/${s.maxMp}`],
      ["ATK", String(s.atk)],
      ["DEF", String(s.def)],
      ["Chí mạng", crit],
      ["Lực Chiến", s.power.toLocaleString("vi-VN")],
    ]) {
      const d = el("div");
      d.append(el("span", "", k!), el("b", "", v!));
      sum.append(d);
    }
    const freeLine = el("div", "cw-free");
    freeLine.append(el("span", "", "Điểm tiềm năng còn"), el("b", "", String(free)));
    const rows = el("div", "cw-rows");
    for (const [k, name, per] of ROWS) {
      const r = el("div", "cw-row");
      const label = el("span");
      label.append(el("b", "", name), el("small", "", ` ${per} · đã cộng ${s.pts[k]}`));
      if (this.pend[k]) label.append(el("em", "", ` +${this.pend[k]}`));
      const add = (n: number) => () => {
        this.pend[k] = Math.max(0, this.pend[k] + n);
        this.render();
      };
      const gain = this.pend[k] * POINT_VALUE[k];
      const val = el(
        "span",
        "cw-val",
        gain ? `+${k === "crit" ? `${(gain * 100).toFixed(2).replace(".", ",")}%` : gain}` : "",
      );
      r.append(label, val, btn("−", add(-1), !this.pend[k]), btn("+", add(1), free < 1), btn("+5", add(5), free < 5));
      r.dataset.k = k;
      rows.append(r);
    }
    const foot = el("div", "cw-foot");
    foot.append(
      btn(
        "Cộng gợi ý",
        () => {
          suggestedPoints(free, this.pend);
          this.render();
        },
        free < 1,
      ),
      btn(
        "Hủy",
        () => {
          this.pend = empty();
          this.render();
        },
        !this.used(),
      ),
      btn(
        "Xác nhận",
        () => {
          this.net.send(Op.C_ALLOCATE_POINTS, this.pend);
          this.pend = empty();
        },
        !this.used(),
        "ok",
      ),
    );
    const note = el(
      "p",
      "cw-note",
      "Mỗi cấp +5 điểm. Cộng rồi không trả lại miễn phí. Gợi ý: 2 HP, 2 ATK, 1 DEF mỗi 5 điểm.",
    );
    this.root.replaceChildren(head, sum, freeLine, rows, foot, note);
  }
}

import { type ClassId, Op, type RiteInfo } from "@htk/shared";
import type { Connection } from "../net/connection";
import { button, el } from "./dom";

const COLOR: Record<string, string> = {
  FIRE: "#e4572e",
  WATER: "#3a86ff",
  WIND: "#2ec4b6",
  BOLT: "#ffd23f",
  EARTH: "#8d6e63",
  PLANT: "#5cb85c",
  DARK: "#5b3e96",
};

/** Lễ Khai Thư window (classes §3, ui-ux §6): pick Hỏa or Thủy; the other five are shown as "Sắp có". */
export class RiteWindow {
  readonly root = el("div", "rite");
  private info: RiteInfo | null = null;
  private sel: ClassId = "FIRE";

  constructor(
    stage: HTMLElement,
    private readonly net: Connection,
  ) {
    this.root.hidden = true;
    stage.append(this.root);
  }

  get open(): boolean {
    return !this.root.hidden;
  }
  close(): void {
    this.root.hidden = true;
  }
  show(info: RiteInfo): void {
    this.info = info;
    this.sel = info.current === "FIRE" ? "WATER" : "FIRE";
    this.root.hidden = false;
    this.render();
  }

  private render(): void {
    const info = this.info!;
    const change = !!info.current;
    const head = el("div", "rt-head");
    head.append(
      el("b", "", change ? "Đổi hệ phép" : "Lễ Khai Thư"),
      button("×", () => this.close(), "x"),
    );
    const list = el("div", "clist");
    for (const k of info.classes) {
      const b = button(
        "",
        () => {
          this.sel = k.id;
          this.render();
        },
        `ccard${this.sel === k.id ? " on" : ""}`,
      );
      b.dataset.cls = k.id;
      const emb = el("i", "emb");
      emb.style.setProperty("--c", COLOR[k.id]!);
      b.append(emb, el("b", "", k.name), el("small", "", info.current === k.id ? "Hệ hiện tại" : k.role));
      list.append(b);
    }
    for (const k of info.locked) {
      const b = button("", () => {}, "ccard", true);
      const emb = el("i", "emb");
      emb.style.setProperty("--c", COLOR[k.id] ?? "#888");
      b.append(emb, el("b", "", k.name), el("small", "", "Sắp có"));
      list.append(b);
    }
    const c = info.classes.find((k) => k.id === this.sel)!;
    const d = el("div", "cdetail");
    d.append(el("h3", "", c.name), el("p", "meta", `${c.role} · vũ khí ${c.weapon} · ${c.mods}`));
    const pas = el("p", "opass");
    pas.append(el("strong", "", `${c.passive}: `), document.createTextNode(c.passiveText));
    d.append(pas);
    for (const s of c.skills) {
      const r = el("div", "sk");
      r.append(
        el("span", "lv", `Lv${s.lv}`),
        el("b", "", s.name),
        el("span", "", ` · ${s.text}`),
        el("small", "", ` ${s.mp} MP · ${s.cd}s`),
      );
      d.append(r);
    }
    const same = info.current === this.sel;
    const note = change
      ? `Đổi miễn phí, còn ${info.freeHoursLeft ?? 0} giờ.`
      : "Nhận Huyền Thư Sơ Bản và vũ khí của hệ. Được đổi hệ miễn phí trong 24 giờ đầu.";
    const foot = el("div", "rt-foot");
    foot.append(
      el("span", "", note),
      button(
        same ? "Đang là hệ này" : change ? `Đổi sang ${c.name}` : `Khai Thư: ${c.name}`,
        () => {
          this.net.send(Op.C_CHOOSE_CLASS, { classId: this.sel });
          this.close();
        },
        "ok go",
        same,
      ),
    );
    d.append(foot);
    const body = el("div", "rt-body");
    body.append(list, d);
    this.root.replaceChildren(head, body);
  }
}

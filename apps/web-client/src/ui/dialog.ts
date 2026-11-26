import { Op, type SNpcDialog, type SScene } from "@htk/shared";
import type { Connection } from "../net/connection";
import type { GameState } from "../state";
import { button, el, face, fmt, playerFace } from "./dom";

/**
 * NPC dialog box (ui-ux §5): portrait, name, line, up to 6 choices; keys 1-6, F/Enter/Space = first, Esc closes.
 * Also plays cutscenes (S_SCENE) line by line and shows the "Hết Chương 1" card.
 */
export class DialogBox {
  readonly root = el("div", "dlg");
  readonly card = el("div", "chapter");
  private choices: (() => void)[] = [];
  /** last dialog shown (tests) */
  last: SNpcDialog | null = null;
  onShop: (d: SNpcDialog) => void = () => {};
  onRite: (d: SNpcDialog) => void = () => {};
  onQuests: () => void = () => {};

  constructor(
    stage: HTMLElement,
    private readonly state: GameState,
    private readonly net: Connection,
  ) {
    this.root.hidden = true;
    this.card.hidden = true;
    stage.append(this.root, this.card);
    window.addEventListener(
      "keydown",
      (e) => {
        if (this.root.hidden || (document.activeElement as HTMLElement)?.tagName === "INPUT") return;
        let i = -1;
        if (/^[1-6]$/.test(e.key)) i = Number(e.key) - 1;
        else if (["f", "F", "Enter", " "].includes(e.key)) i = 0;
        else if (e.key === "Escape") i = this.choices.length - 1;
        if (i >= 0 && this.choices[i]) {
          e.preventDefault();
          e.stopImmediatePropagation();
          this.choices[i]!();
        }
      },
      true,
    );
  }

  get open(): boolean {
    return !this.root.hidden || !this.card.hidden;
  }
  close(): void {
    this.root.hidden = true;
    this.choices = [];
  }

  private render(
    portrait: HTMLElement,
    name: string,
    text: string,
    opts: { label: string; mark?: string; style?: string; on: () => void }[],
  ): void {
    const head = el("div", "dlg-head");
    head.append(portrait, el("b", "", name));
    const body = el("div", "dlg-text");
    for (const line of text.split("\n")) body.append(el("p", "", line));
    const menu = el("div", "dlg-menu");
    this.choices = opts.map((o) => o.on);
    opts.forEach((o, i) => {
      const b = button("", o.on, o.style ?? "");
      b.append(el("kbd", "", String(i + 1)));
      if (o.mark) b.append(el("span", `mk ${o.style ?? ""}`, o.mark));
      b.append(el("span", "", o.label));
      b.dataset.id = String(i);
      menu.append(b);
    });
    this.root.replaceChildren(head, body, menu);
    this.root.hidden = false;
  }

  show(d: SNpcDialog): void {
    this.last = d;
    if (d.shop) {
      this.close();
      return this.onShop(d);
    }
    if (d.rite) {
      this.close();
      return this.onRite(d);
    }
    this.render(
      face(d.face),
      d.name,
      d.text,
      d.options.map((o) => ({
        label: o.label,
        mark: o.mark,
        style: o.style,
        on: () => {
          if (o.id === "CLOSE") return this.close();
          if (o.id === "QUESTS") {
            this.close();
            return this.onQuests();
          }
          this.net.send(Op.C_NPC_CHOICE, { npcId: d.npcId, optionId: o.id });
          if (o.id !== "SHOP" && o.id !== "SCHEDULE" && o.id !== "RITE") this.close();
        },
      })),
    );
  }

  /** S_SCENE: one line at a time; a quest scene (report) answers SCENE_DONE, Q_MAIN_12 ends on the chapter card. */
  playScene(s: SScene, sheet: string): void {
    let i = 0;
    const next = () => {
      const l = s.lines[i]!,
        last = i === s.lines.length - 1;
      this.render(l.who === "PLAYER" ? playerFace(sheet) : face(l.face ?? 0), l.name, l.text, [
        {
          label: last ? "Xong" : "Tiếp ▸",
          on: () => {
            if (!last) {
              i++;
              return next();
            }
            this.close();
            // the server finds the scene from the quest; npcId is only there to fit the message
            if (s.report) this.net.send(Op.C_NPC_CHOICE, { npcId: "NPC001", optionId: "SCENE_DONE" });
            if (s.chapterEnd) this.chapterEnd(s.chapterEnd);
          },
        },
      ]);
    };
    next();
  }

  private chapterEnd(c: NonNullable<SScene["chapterEnd"]>): void {
    const letter = el("div", "letter");
    letter.append(
      el("p", "", `“${c.letter}”`),
      el("small", "", "— Bạch Vân. Lá thư để lại trên bàn nhà học, sáng hôm sau."),
    );
    const stats = el("div", "chstats");
    for (const [k, v] of [
      ["Thời gian chơi", `${c.minutes} phút`],
      ["Cấp", `Lv ${c.lv}`],
      ["Lực Chiến", fmt(c.power)],
      ["Hệ phép", c.className],
    ]) {
      const s = el("span", "", k!);
      s.append(el("b", "", v!));
      stats.append(s);
    }
    this.card.replaceChildren(
      el("h3", "", "Chương 1 · Làng Suối Mơ"),
      letter,
      stats,
      el("p", "chnext", "Chương 2: Thượng Đô và Mùa Tuyển Thư (sắp có). Trong 24 giờ đầu có thể đổi hệ phép ở Bà Mơ."),
      button(
        "Về làng",
        () => {
          this.card.hidden = true;
          this.net.send(Op.C_LEAVE_INSTANCE);
        },
        "ok",
      ),
    );
    this.card.hidden = false;
    void this.state;
  }
}

import type { QuestView, SQuestUpdate } from "@htk/shared";
import type { GameState } from "../state";
import { button, el, fmt, icon } from "./dom";

/** Quest tracker (ui-ux §3.1), quest window (L, ui-ux §6.4) and the accept/complete banner. */
export class QuestUi {
  readonly tracker = el("button", "qtrack");
  readonly win = el("div", "qwin");
  readonly banner = el("div", "qbanner");
  private bannerTimer = 0;

  constructor(
    stage: HTMLElement,
    private readonly state: GameState,
  ) {
    this.win.hidden = true;
    this.banner.hidden = true;
    this.tracker.type = "button";
    this.tracker.addEventListener("click", () => this.toggle());
    stage.append(this.tracker, this.win, this.banner);
    state.subscribe(() => this.render());
    this.render();
  }

  get open(): boolean {
    return !this.win.hidden;
  }
  toggle(force?: boolean): void {
    this.win.hidden = !(force ?? this.win.hidden);
    this.render();
  }

  /** S_QUEST_UPDATE: new state, then a banner for accepted / completed */
  apply(u: SQuestUpdate): void {
    this.state.quests = u;
    this.state.changed();
    if (u.event?.kind === "accepted") this.show("Nhận nhiệm vụ", u.event.title);
    if (u.event?.kind === "ready") this.show("Đủ mục tiêu", `${u.event.title}: về gặp ${u.main?.turnIn.name ?? ""}`);
    if (u.event?.kind === "completed") this.show("Hoàn thành nhiệm vụ", u.event.title, u.event.rewards);
  }

  private show(title: string, sub: string, r?: QuestView["rewards"]): void {
    this.banner.replaceChildren(el("b", "ribbon", title), el("span", "sub", sub));
    if (r) this.banner.append(rewards(r));
    this.banner.classList.toggle("done", !!r);
    this.banner.hidden = false;
    clearTimeout(this.bannerTimer);
    this.bannerTimer = window.setTimeout(() => (this.banner.hidden = true), 2900);
  }

  render(): void {
    const u = this.state.quests,
      q = u.main;
    const head = el("span", "qh");
    head.append(el("span", "", "Nhiệm vụ"), el("kbd", "", "L"));
    const rows: HTMLElement[] = [head];
    this.tracker.className = `qtrack ${q?.status === "READY" ? "ready" : q?.status === "AVAILABLE" ? "avail" : ""}`;
    if (!q)
      rows.push(
        el("span", "qn", u.chapterName ?? "Chính tuyến"),
        el("span", "qo dim", u.wait ?? "Hết nội dung hiện có."),
      );
    else {
      rows.push(el("span", "qn", q.title));
      if (q.status === "LOCKED") rows.push(el("span", "qo dim", `Đạt Lv ${q.levelMin} để nhận`));
      else if (q.status === "AVAILABLE") rows.push(el("span", "qo go", `Gặp ${q.giver.name} để nhận`));
      else if (q.status === "READY") rows.push(el("span", "qo ok", `✔ Về gặp ${q.turnIn.name}`));
      else
        for (const o of q.objectives) {
          const r = el("span", `qo ${o.got >= o.count ? "ok" : ""}`);
          r.append(
            el("span", "", o.label),
            el("b", "", o.count > 1 ? `${o.got}/${o.count}` : o.got >= o.count ? "✔" : "…"),
          );
          rows.push(r);
        }
    }
    this.tracker.replaceChildren(...rows);
    if (!this.win.hidden) this.renderWin();
  }

  private renderWin(): void {
    const u = this.state.quests,
      q = u.main;
    const head = el("div", "qw-head");
    head.append(
      el("b", "", `Chính tuyến · ${u.chapterName ?? `Chương ${u.chapter ?? 1}`} (${u.done}/${u.total})`),
      button("×", () => this.toggle(false), "x"),
    );
    const body = el("div", "qw-body");
    if (!q) body.append(el("p", "", u.wait ?? "Bạn đã đi hết chuỗi chính tuyến hiện có."));
    else {
      body.append(el("h3", "", q.title));
      const who = el("p", "npc");
      who.textContent =
        q.giver.id === q.turnIn.id ? `Giao và trả: ${q.giver.name}` : `Giao: ${q.giver.name} · Trả: ${q.turnIn.name}`;
      body.append(who, el("p", "say", q.status === "ACTIVE" ? q.text.progress : q.text.accept));
      const ul = el("ul", "objs");
      for (const o of q.objectives) {
        const li = el("li", o.got >= o.count ? "ok" : "");
        li.append(el("b", "", `${o.label}${o.count > 1 ? ` ${o.got}/${o.count}` : ""}`), el("small", "", o.where));
        ul.append(li);
      }
      body.append(ul, el("p", "lbl", "Phần thưởng"), rewards(q.rewards));
      const hint =
        q.status === "LOCKED"
          ? `Đạt Lv ${q.levelMin} rồi gặp ${q.giver.name}.`
          : q.status === "AVAILABLE"
            ? `Gặp ${q.giver.name} (nhấn F khi đứng gần) để nhận.`
            : q.status === "READY"
              ? `Về gặp ${q.turnIn.name} để trả nhiệm vụ.`
              : "Phím L mở hoặc đóng bảng.";
      body.append(el("p", "hint", hint));
    }
    this.win.replaceChildren(head, body);
  }
}

export function rewards(r: QuestView["rewards"]): HTMLElement {
  const box = el("div", "rews");
  const chip = (i: HTMLElement | null, text: string) => {
    const s = el("span", "rw");
    if (i) s.append(i);
    s.append(document.createTextNode(text));
    box.append(s);
  };
  if (r.exp) chip(el("span", "badge", "EXP"), ` +${fmt(r.exp)}`);
  if (r.soft) chip(icon("quan", "1.6cqw"), ` ${fmt(r.soft)} Quan`);
  for (const it of r.items) chip(icon(it.icon, "1.6cqw"), ` ${it.name}${it.qty > 1 ? ` ×${it.qty}` : ""}`);
  if (r.skill) chip(el("span", "badge skill", "✦"), ` ${r.skill}`);
  if (r.note) chip(null, r.note);
  return box;
}

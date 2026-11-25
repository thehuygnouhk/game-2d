import { Op, type SBossState, type SChatMsg, type SInstanceState, type SZoneList } from "@htk/shared";
import type { Connection } from "../net/connection";
import type { GameState } from "../state";

/** DOM HUD over the canvas (ui-ux §3.1): character frame, zone, chat, action bar, death panel, toasts. */
const POTIONS = [
  { key: "Q", id: "hp" },
  { key: "E", id: "mp" },
] as const;

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = "", text = ""): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
};
const pct = (a: number, b: number) => `${Math.max(0, Math.min(100, (100 * a) / Math.max(1, b))).toFixed(1)}%`;

export class Hud {
  readonly root = el("div", "hud-root");
  private readonly me = el("div", "hud-me");
  private readonly zoneBtn = el("button", "hud-zone");
  private readonly zoneList = el("div", "hud-zones");
  private readonly net = el("div", "hud-net");
  private readonly log = el("div", "chat-log");
  readonly chatInput = el("input", "chat-in");
  private readonly bar = el("div", "hud-actions");
  private readonly toastBox = el("div", "hud-toast");
  private readonly dead = el("div", "hud-dead");
  private readonly channelBtn = el("button", "chat-ch", "Khu");
  private readonly menu = el("div", "hud-menu");
  readonly charBtn = el("button", "menu-btn");
  readonly bagBtn = el("button", "menu-btn", "Hành trang (B)");
  readonly questBtn = el("button", "menu-btn", "Nhiệm vụ (L)");
  private readonly bossBar = el("div", "hud-boss");
  private readonly inst = el("div", "hud-inst");
  private instEnds = 0;
  private barKey = "";
  private channel: "MAP" | "WORLD" = "MAP";
  private toastTimer = 0;
  /** lines shown in the chat box, for tests and the scene */
  readonly lines: { channel: string; text: string }[] = [];
  onChatFocus: (focused: boolean) => void = () => {};
  onAction: (id: string) => void = () => {};
  onCharWindow: () => void = () => {};
  onBag: () => void = () => {};
  onQuests: () => void = () => {};

  constructor(
    stage: HTMLElement,
    private readonly state: GameState,
    private readonly conn: Connection,
  ) {
    this.zoneList.hidden = true;
    this.dead.hidden = true;
    this.bossBar.hidden = true;
    this.inst.hidden = true;
    const chat = el("div", "hud-chat");
    this.chatInput.maxLength = 120;
    this.chatInput.placeholder = "Enter để chat";
    this.chatInput.autocomplete = "off";
    this.channelBtn.type = "button";
    this.channelBtn.title = "Đổi kênh: Khu (cùng map và khu) hoặc Thế giới (cả máy chủ, 10 giây một tin)";
    this.channelBtn.addEventListener("click", () => {
      this.channel = this.channel === "MAP" ? "WORLD" : "MAP";
      this.channelBtn.textContent = this.channel === "MAP" ? "Khu" : "Thế giới";
      this.channelBtn.classList.toggle("world", this.channel === "WORLD");
    });
    const line = el("div", "chat-line");
    line.append(this.channelBtn, this.chatInput);
    chat.append(this.log, line);
    this.charBtn.type = "button";
    this.charBtn.addEventListener("click", () => this.onCharWindow());
    const swap = el("button", "menu-btn", "Đổi nhân vật");
    swap.type = "button";
    swap.addEventListener("click", () => location.reload());
    for (const b of [this.bagBtn, this.questBtn]) b.type = "button";
    this.bagBtn.addEventListener("click", () => this.onBag());
    this.questBtn.addEventListener("click", () => this.onQuests());
    this.menu.append(this.charBtn, this.bagBtn, this.questBtn, swap);
    this.root.append(
      this.me,
      this.zoneBtn,
      this.zoneList,
      this.net,
      this.menu,
      chat,
      this.bar,
      this.toastBox,
      this.dead,
      this.bossBar,
      this.inst,
    );
    stage.append(this.root);
    this.zoneBtn.type = "button";
    this.zoneBtn.addEventListener("click", () => {
      if (this.zoneList.hidden) conn.send(Op.C_REQUEST_ZONES);
      else this.zoneList.hidden = true;
    });
    conn.on<SZoneList>(Op.S_ZONE_LIST, (l) => this.showZones(l));
    conn.on<SChatMsg>(Op.S_CHAT_MSG, (m) =>
      this.chat(
        m.channel,
        m.channel === "MAP"
          ? `${m.fromName}: ${m.text}`
          : m.channel === "WORLD"
            ? `[Thế giới] ${m.fromName}: ${m.text}`
            : m.text,
      ),
    );
    this.chatInput.addEventListener("focus", () => this.onChatFocus(true));
    this.chatInput.addEventListener("blur", () => this.onChatFocus(false));
    this.chatInput.addEventListener("keydown", (e) => {
      e.stopPropagation();
      if (e.key === "Enter") {
        const text = this.chatInput.value.trim();
        if (text) conn.send(Op.C_CHAT_SEND, { channel: this.channel, text });
        this.chatInput.value = "";
        this.chatInput.blur();
      } else if (e.key === "Escape") this.chatInput.blur();
    });
    window.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && document.activeElement !== this.chatInput) {
        e.preventDefault();
        this.chatInput.focus();
      }
    });
    state.subscribe(() => this.render());
    this.render();
    window.setInterval(() => this.tick(), 100);
  }

  private showZones(l: SZoneList): void {
    this.zoneList.replaceChildren();
    for (const z of l.zones) {
      const b = el("button", z.zoneNo === this.state.map.zone ? "on" : "", `Khu ${z.zoneNo}`);
      b.type = "button";
      const full = z.players >= z.cap;
      b.append(el("small", full ? "full" : "", full ? " đầy" : ` ${z.players}/${z.cap}`));
      b.disabled = full || z.zoneNo === this.state.map.zone;
      b.addEventListener("click", () => {
        this.conn.send(Op.C_CHANGE_ZONE, { zoneNo: z.zoneNo });
        this.zoneList.hidden = true;
      });
      this.zoneList.append(b);
    }
    this.zoneList.hidden = false;
  }

  chat(channel: string, text: string): void {
    this.lines.push({ channel, text });
    const line = el("div", `ln ${channel.toLowerCase()}`, text);
    this.log.append(line);
    while (this.log.children.length > 8) this.log.firstChild!.remove();
  }

  toast(text: string): void {
    this.toastBox.textContent = text;
    this.toastBox.classList.add("on");
    clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => this.toastBox.classList.remove("on"), 2600);
  }

  showDead(loss: number, onRevive: () => void): void {
    this.dead.replaceChildren(
      el("p", "t", "Bạn đã gục ngã"),
      el("p", "s", loss > 0 ? `Mất ${loss.toLocaleString("vi-VN")} EXP (2%)` : "Không mất EXP"),
    );
    const b = el("button", "revive", this.state.instance?.kind === "DUNGEON" ? "Về cổng hầm ngục" : "Về làng hồi sinh");
    b.type = "button";
    b.addEventListener("click", () => {
      b.disabled = true;
      onRevive();
    });
    this.dead.append(b);
    this.dead.hidden = false;
  }
  hideDead(): void {
    this.dead.hidden = true;
  }

  /** hotbar: the skills the server listed (J, 1-4), then the potions */
  private buildBar(): void {
    const acts = [...this.state.skills.map((k) => ({ key: k.key ?? "", id: k.id })), ...POTIONS];
    const key = acts.map((a) => a.id).join();
    if (key === this.barKey) return;
    this.barKey = key;
    this.bar.replaceChildren();
    for (const a of acts) {
      const b = el("button", "act");
      b.type = "button";
      b.dataset.id = a.id;
      b.append(el("kbd", "", a.key), el("span", "nm"), el("i", "cd"), el("b", "n"));
      b.addEventListener("click", () => this.onAction(a.id));
      this.bar.append(b);
    }
  }

  /** S_BOSS_STATE: the boss bar (maps §5) */
  boss(b: SBossState): void {
    if (b.over) {
      this.state.boss = null;
      this.bossBar.hidden = true;
      return;
    }
    this.state.boss = b;
    const fill = el("i");
    fill.style.width = pct(b.hpPct, 1);
    const bar = el("div", "bar hp");
    bar.append(fill, el("span", "", `${Math.round(b.hpPct * 100)}%`));
    const name =
      b.pieces !== undefined
        ? `Mảnh Trang · còn ${b.pieces}/4`
        : `${b.name} · Lv ${b.lv}${b.enraged ? " · CUỒNG NỘ" : ""}`;
    this.bossBar.replaceChildren(el("b", "", name), bar);
    this.bossBar.hidden = false;
  }

  /** S_INSTANCE_STATE: dungeon clock and the way out */
  instance(s: SInstanceState | null): void {
    this.state.instance = s;
    if (!s) {
      this.inst.hidden = true;
      return;
    }
    this.instEnds = s.leftMs !== undefined ? performance.now() + s.leftMs : 0;
    const leave = el("button", "leave", s.kind === "DUNGEON" ? "Rời hầm ngục" : "Về làng");
    leave.type = "button";
    leave.addEventListener("click", () => this.conn.send(Op.C_LEAVE_INSTANCE));
    this.inst.replaceChildren(el("span", "clock"), leave);
    if (s.bossDown) this.inst.append(el("small", "", s.chest?.opened ? "Đã mở rương" : "Mở Rương Tân Thủ (F)"));
    this.inst.hidden = false;
  }

  render(): void {
    this.buildBar();
    const s = this.state.stats;
    const rally = performance.now() < this.state.rallyUntil;
    this.me.replaceChildren();
    const head = el("div", "nm");
    head.append(el("b", "", this.state.name), el("span", "lv", `Lv ${s.lv}`));
    if (rally) head.append(el("span", "buff", "Không Lùi Bước"));
    const bar = (cls: string, a: number, b: number, label: string) => {
      const d = el("div", `bar ${cls}`);
      const fill = el("i");
      fill.style.width = pct(a, b);
      d.append(fill, el("span", "", label));
      return d;
    };
    this.me.append(
      head,
      bar("hp", s.hp, s.maxHp, `${s.hp}/${s.maxHp}`),
      bar("mp", s.mp, s.maxMp, `${s.mp}/${s.maxMp}`),
      bar("exp", s.exp, s.expNext, `EXP ${((100 * s.exp) / s.expNext).toFixed(2).replace(".", ",")}%`),
    );
    const soft = el("div", "soft");
    soft.append(el("i", "coin"), el("b", "", this.state.bag.soft.toLocaleString("vi-VN")), el("span", "", " Quan"));
    soft.append(el("span", "pw", ` · Lực Chiến ${s.power.toLocaleString("vi-VN")}`));
    this.me.append(soft);
    this.zoneBtn.textContent = `${this.state.map.name} · Khu ${this.state.map.zone} ▾`;
    this.charBtn.replaceChildren(document.createTextNode("Nhân vật (C)"));
    if (s.statPoints > 0) this.charBtn.append(el("b", "badge", `+${s.statPoints}`));
    for (const b of this.bar.querySelectorAll<HTMLButtonElement>(".act")) {
      const id = b.dataset.id!;
      const nm = b.querySelector(".nm")!,
        n = b.querySelector(".n")!;
      if (id === "hp" || id === "mp") {
        nm.textContent = id === "hp" ? "Bình HP" : "Bình MP";
        const c = this.state.potionCount(id);
        n.textContent = c ? String(c) : "";
        b.classList.toggle("locked", c === 0);
      } else {
        const sk = this.state.skill(id);
        nm.textContent = sk?.name ?? id;
        b.classList.toggle("locked", !sk || s.lv < sk.unlockLevel);
        n.textContent = sk && s.lv < sk.unlockLevel ? `Lv${sk.unlockLevel}` : "";
      }
    }
  }

  private tick(): void {
    const now = performance.now();
    for (const b of this.bar.querySelectorAll<HTMLButtonElement>(".act")) {
      const id = b.dataset.id!,
        ready = this.state.ready.get(id) ?? 0;
      const total = id === "hp" || id === "mp" ? 8000 : (this.state.skill(id)?.cooldownMs ?? 1000);
      const left = Math.max(0, ready - now);
      (b.querySelector(".cd") as HTMLElement).style.height = left > 0 ? pct(left, total) : "0%";
    }
    this.net.textContent = `● ${this.conn.rtt} ms`;
    const clock = this.inst.querySelector(".clock");
    if (clock && this.instEnds) {
      const left = Math.max(0, Math.round((this.instEnds - now) / 1000));
      clock.textContent = `⏳ ${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;
    }
    if (this.state.rallyUntil && now > this.state.rallyUntil) {
      this.state.rallyUntil = 0;
      this.render();
    }
  }
}

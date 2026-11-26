import { button, el } from "./dom";

/** What the virtual controls hold down; the scene reads it with the keyboard (ui-ux §3.2 phím ảo). */
export interface VirtualInput {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  jump: boolean;
  attack: boolean;
}

/** Touch controls are on for touch screens (coarse pointer), on the first finger touch, or with ?touch=1. */
export function touchWanted(): boolean {
  return (
    new URLSearchParams(location.search).has("touch") ||
    (typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches)
  );
}

/**
 * Phím ảo (same layout as the browser prototype): a joystick on the left (sideways walks, up jumps, climbs and
 * goes through portals, down drops through thin floors and climbs down) and big buttons on the right.
 * Skills and potions are the HUD action bar buttons, which are tappable already.
 */
export class TouchPad {
  readonly v: VirtualInput = { left: false, right: false, up: false, down: false, jump: false, attack: false };
  readonly root = el("div", "tpad");
  private readonly joy = el("div", "joy");
  private readonly knob = el("i", "knob");
  onInteract: () => void = () => {};
  onTarget: () => void = () => {};

  constructor(private readonly stage: HTMLElement) {
    this.joy.append(this.knob);
    const btns = el("div", "tbtns");
    btns.append(
      this.hold("Đánh", "attack", "big atk"),
      this.hold("Nhảy", "jump", "jump"),
      this.tap("Nói", () => this.onInteract(), "talk", "Nói chuyện, hái, mở rương (F)"),
      this.tap("◎", () => this.onTarget(), "tgt", "Chọn quái (Tab)"),
    );
    const full = button("⛶", () => void this.fullscreen(), "tfull");
    full.title = "Toàn màn hình";
    const rotate = el("div", "rotate", "Xoay ngang điện thoại để chơi");
    this.root.append(this.joy, btns, full, rotate);
    stage.append(this.root);
    this.joystick();
  }

  /** show the controls (and the phone layout) */
  enable(on = true): void {
    this.stage.classList.toggle("touch-on", on);
    document.body.classList.toggle("touch-on", on);
  }
  get enabled(): boolean {
    return this.stage.classList.contains("touch-on");
  }

  private hold(text: string, k: "attack" | "jump", cls: string): HTMLButtonElement {
    const b = el("button", `tb ${cls}`, text);
    b.type = "button";
    const on = (e: Event) => {
      e.preventDefault();
      this.v[k] = true;
      b.classList.add("on");
    };
    const off = (e: Event) => {
      e.preventDefault();
      this.v[k] = false;
      b.classList.remove("on");
    };
    b.addEventListener("pointerdown", on);
    for (const ev of ["pointerup", "pointerleave", "pointercancel"]) b.addEventListener(ev, off);
    b.addEventListener("contextmenu", (e) => e.preventDefault());
    return b;
  }

  private tap(text: string, fn: () => void, cls: string, title: string): HTMLButtonElement {
    const b = el("button", `tb ${cls}`, text);
    b.type = "button";
    b.title = title;
    b.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      fn();
    });
    return b;
  }

  private joystick(): void {
    let id: number | null = null;
    const set = (e: PointerEvent) => {
      const r = this.joy.getBoundingClientRect();
      let dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2),
        dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
      const len = Math.hypot(dx, dy);
      if (len > 1) {
        dx /= len;
        dy /= len;
      }
      this.knob.style.transform = `translate(${dx * r.width * 0.3}px, ${dy * r.height * 0.3}px)`;
      Object.assign(this.v, { left: dx < -0.35, right: dx > 0.35, up: dy < -0.55, down: dy > 0.6 });
    };
    this.joy.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      id = e.pointerId;
      try {
        this.joy.setPointerCapture(id);
      } catch {
        // the pointer is already gone
      }
      set(e);
    });
    this.joy.addEventListener("pointermove", (e) => e.pointerId === id && set(e));
    const end = (e: PointerEvent) => {
      if (e.pointerId !== id) return;
      id = null;
      this.knob.style.transform = "";
      Object.assign(this.v, { left: false, right: false, up: false, down: false });
    };
    this.joy.addEventListener("pointerup", end);
    this.joy.addEventListener("pointercancel", end);
  }

  /** browser bars take a lot of a phone screen: full screen and landscape when the browser allows it */
  private async fullscreen(): Promise<void> {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else {
        await document.documentElement.requestFullscreen({ navigationUI: "hide" });
        await (screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> }).lock?.("landscape");
      }
    } catch {
      // iOS Safari has no fullscreen for pages: "Thêm vào Màn hình chính" gives the same room
    }
  }
}

/** Small DOM helpers shared by the windows (text always goes through textContent: security §chat). */
export const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = "", text = ""): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
};

export function button(text: string, on: () => void, cls = "", disabled = false): HTMLButtonElement {
  const b = el("button", cls, text);
  b.type = "button";
  b.disabled = disabled;
  b.addEventListener("click", on);
  return b;
}

/** Icon names of sprites/items.png (8 per row, 32 px), loaded from sprites/items.json at start. */
let ICONS: string[] = [];
export async function loadIcons(): Promise<void> {
  try {
    ICONS = (await (await fetch("sprites/items.json")).json()) as string[];
  } catch {
    ICONS = [];
  }
}
export function icon(name: string | undefined, size = "2.4cqw"): HTMLElement {
  const i = el("i", "icon");
  const n = Math.max(0, ICONS.indexOf(name ?? "quan"));
  const rows = Math.max(1, Math.ceil(ICONS.length / 8));
  i.style.setProperty("--s", size);
  i.style.backgroundSize = `800% ${rows * 100}%`;
  i.style.backgroundPosition = `${((n % 8) * 100) / 7}% ${rows > 1 ? (Math.floor(n / 8) * 100) / (rows - 1) : 0}%`;
  return i;
}

/** NPC portrait: first frame of its row in sprites/npc_idle.png (4 × 9 frames). */
export function face(row: number): HTMLElement {
  const f = el("i", "face");
  f.style.backgroundPosition = `0% ${(row * 100) / 8}%`;
  return f;
}
/** Player portrait from the character sheet (6 × 5 frames of 96 px). */
export function playerFace(sheet: string): HTMLElement {
  const f = el("i", "face pc");
  f.style.backgroundImage = `url(sprites/player/${sheet}.png)`;
  return f;
}

export const RARITY_NAME: Record<string, string> = { common: "Thường", good: "Tốt", rare: "Hiếm", epic: "Sử Thi" };
export const SLOT_NAME: Record<string, string> = {
  weapon: "Vũ khí",
  hat: "Mũ",
  armor: "Áo",
  boots: "Giày",
  tome: "Huyền Thư",
};
export const fmt = (n: number) => n.toLocaleString("vi-VN");

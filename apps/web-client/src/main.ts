import Phaser from "phaser";
import {
  ErrorCode,
  Op,
  type SEnterWorld,
  type SError,
  type SInventoryDelta,
  type SKick,
  type SMapChange,
  type SStatsUpdate,
} from "@htk/shared";
import { Api, ApiError, type CharacterSummary } from "./net/api";
import { Connection } from "./net/connection";
import { WorldScene, type WorldData } from "./scenes/WorldScene";
import { GameState } from "./state";
import { CharWindow } from "./ui/charwin";
import { Hud } from "./ui/hud";

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const stage = $("stage"),
  status = $("status");
const params = new URLSearchParams(location.search);
const api = new Api(import.meta.env.VITE_API_URL ?? "/api");
const ORIGIN_NAME: Record<string, string> = { VILLAGER: "Dân Làng", NOBLE: "Thế Gia", ANCIENT: "Hậu Duệ Tộc Cổ Thư" };
/** in-game errors worth telling the player (network-protocol §8); cooldown refusals stay silent */
const GAME_ERRORS: Record<number, string> = {
  [ErrorCode.E_RATE_LIMIT]: "Gửi nhanh quá, chậm lại một chút (chat thế giới: 10 giây một tin).",
  [ErrorCode.E_NOT_ENOUGH_MP]: "Thiếu MP.",
  [ErrorCode.E_ZONE_FULL]: "Khu này đã đầy.",
  [ErrorCode.E_IN_COMBAT]: "Đang giao tranh: đợi 5 giây rồi đổi khu.",
  [ErrorCode.E_MAP_LOCKED]: "Vùng này chưa mở ở bản online.",
  [ErrorCode.E_INVENTORY_FULL]: "Túi đầy.",
  [ErrorCode.E_LEVEL_REQUIRED]: "Chưa đủ cấp.",
  [ErrorCode.E_INTERNAL]: "Máy chủ chưa lưu được, thử lại.",
};
const ENTER_ERRORS: Record<number, string> = {
  [ErrorCode.E_VERSION]: "Phiên bản game cũ, hãy tải lại trang.",
  [ErrorCode.E_AUTH]: "Vé vào game hết hạn, hãy bấm Vào game lại.",
  [ErrorCode.E_ZONE_FULL]: "Các khu đều đã đầy, thử lại sau.",
  [ErrorCode.E_INTERNAL]: "Máy chủ gặp lỗi.",
};

let game: Phaser.Game | null = null;

/** The game server address: ?ws= or VITE_GAME_WS_URL win; a "localhost" realm URL follows the page host (LAN). */
function wsUrlFor(fromApi: string): string {
  const forced = params.get("ws") ?? import.meta.env.VITE_GAME_WS_URL;
  if (forced) return forced;
  const u = new URL(fromApi);
  if (["localhost", "127.0.0.1"].includes(u.hostname) && !["localhost", "127.0.0.1"].includes(location.hostname))
    u.hostname = location.hostname;
  return u.toString().replace(/\/$/, "");
}

function show(id: "auth" | "chars" | null): void {
  $("auth").hidden = id !== "auth";
  $("chars").hidden = id !== "chars";
}

/* ---------------- sign in, sign up ---------------- */
function setupAuth(): void {
  const err = $("auth-err");
  for (const b of document.querySelectorAll<HTMLButtonElement>("#auth .tabs button"))
    b.addEventListener("click", () => {
      for (const x of document.querySelectorAll("#auth .tabs button")) x.classList.toggle("on", x === b);
      $("login-form").hidden = b.dataset.tab !== "login";
      $("register-form").hidden = b.dataset.tab !== "register";
      err.textContent = "";
    });
  const busy = (form: HTMLFormElement, on: boolean) => (form.querySelector("button")!.disabled = on);
  $<HTMLFormElement>("login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = e.currentTarget as HTMLFormElement;
    err.textContent = "";
    busy(f, true);
    try {
      await api.login($<HTMLInputElement>("login-name").value.trim(), $<HTMLInputElement>("login-pass").value);
      await showCharacters();
    } catch (ex) {
      err.textContent = (ex as Error).message;
    } finally {
      busy(f, false);
    }
  });
  $<HTMLFormElement>("register-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = e.currentTarget as HTMLFormElement;
    err.textContent = "";
    const name = $<HTMLInputElement>("reg-name").value.trim(),
      pass = $<HTMLInputElement>("reg-pass").value;
    if (!/^[A-Za-z0-9_]{3,20}$/.test(name))
      return void (err.textContent = "Tên tài khoản: 3–20 chữ cái không dấu, số hoặc _.");
    if (pass.length < 8) return void (err.textContent = "Mật khẩu cần ít nhất 8 ký tự.");
    if (pass !== $<HTMLInputElement>("reg-pass2").value)
      return void (err.textContent = "Hai lần nhập mật khẩu chưa khớp.");
    busy(f, true);
    try {
      await api.register(name, $<HTMLInputElement>("reg-email").value.trim(), pass);
      await showCharacters();
    } catch (ex) {
      err.textContent = (ex as Error).message;
    } finally {
      busy(f, false);
    }
  });
}

/* ---------------- characters ---------------- */
async function showCharacters(): Promise<void> {
  const err = $("chars-err");
  err.textContent = "";
  $("who").textContent = api.username;
  let list: { max: number; characters: (CharacterSummary & { mapName?: string })[] };
  try {
    list = await api.characters();
  } catch (ex) {
    if (ex instanceof ApiError && ex.status === 401) return show("auth");
    err.textContent = (ex as Error).message;
    return show("chars");
  }
  const ul = $("char-list");
  ul.replaceChildren();
  for (const c of list.characters) {
    const li = document.createElement("li");
    const info = document.createElement("span");
    const b = document.createElement("b");
    b.textContent = c.name;
    info.append(b, ` Lv ${c.level} · ${ORIGIN_NAME[c.origin] ?? c.origin}${c.mapName ? ` · ${c.mapName}` : ""}`);
    const go = document.createElement("button");
    go.type = "button";
    go.textContent = "Vào game";
    go.addEventListener("click", () => void enter(c, go));
    li.append(info, go);
    ul.append(li);
  }
  if (!list.characters.length) {
    const li = document.createElement("li");
    li.className = "empty";
    li.textContent = "Chưa có nhân vật. Tạo nhân vật đầu tiên bên dưới.";
    ul.append(li);
  }
  $("create-form").hidden = list.characters.length >= list.max;
  show("chars");
}

function setupCharacters(): void {
  $("logout").addEventListener("click", async () => {
    await api.logout();
    show("auth");
  });
  $<HTMLFormElement>("create-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const err = $("chars-err");
    err.textContent = "";
    const btn = (e.currentTarget as HTMLFormElement).querySelector("button")!;
    btn.disabled = true;
    try {
      await api.createCharacter({
        name: $<HTMLInputElement>("name").value.trim(),
        gender: $<HTMLSelectElement>("gender").value,
        origin: $<HTMLSelectElement>("origin").value,
      });
      $<HTMLInputElement>("name").value = "";
      await showCharacters();
    } catch (ex) {
      err.textContent =
        ex instanceof ApiError && ex.code === "INVALID"
          ? "Tên nhân vật: 3–12 ký tự, chữ (có dấu) hoặc số, một dấu cách giữa các từ."
          : (ex as Error).message;
    } finally {
      btn.disabled = false;
    }
  });
}

/* ---------------- into the world ---------------- */
async function enter(c: CharacterSummary, btn: HTMLButtonElement): Promise<void> {
  const err = $("chars-err");
  err.textContent = "";
  btn.disabled = true;
  let t;
  try {
    t = await api.ticket(c.id);
  } catch (ex) {
    err.textContent = (ex as Error).message;
    btn.disabled = false;
    return;
  }
  const net = new Connection(wsUrlFor(t.wsUrl));
  const offErr = net.on<SError>(Op.S_ERROR, (p) => {
    if (game) return;
    err.textContent = ENTER_ERRORS[p.code] ?? `Lỗi ${p.code}`;
    btn.disabled = false;
  });
  net.on<SKick>(Op.S_KICK, (k) => {
    status.hidden = false;
    status.innerHTML = `<span class="bad">● Đã thoát</span> <em></em>`;
    status.querySelector("em")!.textContent = k.message;
  });
  net.onClose = (reason) => {
    if (!game) {
      btn.disabled = false;
      return;
    }
    if (!status.hidden) return; // the kick message stays
    status.hidden = false;
    status.innerHTML = `<span class="bad">● Mất kết nối</span> <em></em>`;
    status.querySelector("em")!.textContent = `${reason}. Tải lại trang để vào lại.`;
  };
  net.on(Op.S_WELCOME, () => net.send(Op.C_ENTER_WORLD));
  net.on<SEnterWorld>(Op.S_ENTER_WORLD, (e) => {
    offErr();
    startGame(net, e);
  });
  try {
    await net.connect({ ticket: t.ticket, clientVersion: "0.3.0" });
  } catch (ex) {
    err.textContent = (ex as Error).message;
    btn.disabled = false;
  }
}

function startGame(net: Connection, enterWorld: SEnterWorld): void {
  show(null);
  status.hidden = true;
  net.startPing();
  const state = new GameState(enterWorld);
  const hud = new Hud(stage, state, net);
  const cw = new CharWindow(stage, state, net);
  hud.onCharWindow = () => cw.toggle();
  window.addEventListener("keydown", (e) => {
    if ((e.key === "c" || e.key === "C") && document.activeElement !== hud.chatInput) cw.toggle();
    if (e.key === "Escape" && cw.open) cw.toggle(false);
  });
  hud.chat("SYSTEM", `Chào ${state.name}! Đi qua cổng phải để ra Đồng Hoa đánh quái. Enter để chat.`);
  if (state.stats.statPoints > 0)
    hud.chat("SYSTEM", `Bạn có ${state.stats.statPoints} điểm tiềm năng: nhấn C để cộng.`);
  net.on<SStatsUpdate>(Op.S_STATS_UPDATE, (s) => state.applyStats(s));
  net.on<SInventoryDelta>(Op.S_INVENTORY_DELTA, (d) => state.applyInventory(d));
  net.on<SError>(Op.S_ERROR, (e) => {
    const text = e.message === "NOT_ENOUGH_POINTS" ? "Không đủ điểm tiềm năng." : GAME_ERRORS[e.code];
    if (text) hud.toast(text);
  });
  net.on<SMapChange>(Op.S_MAP_CHANGE, (change) => {
    // hold the frames that follow until the new scene has loaded the map (client-design §5)
    net.hold();
    const zoneOnly = change.map.id === state.map.id;
    state.map = change.map;
    state.changed();
    hud.chat(
      "SYSTEM",
      zoneOnly ? `Đã sang Khu ${change.map.zone}.` : `Đến ${change.map.name} · Khu ${change.map.zone}`,
    );
    game!.scene.getScene("world").scene.restart({ net, state, hud, change } satisfies WorldData);
  });
  net.on(Op.S_REVIVED, () => {
    state.dead = false;
    hud.hideDead();
    hud.chat("SYSTEM", "Đã hồi sinh ở làng.");
  });
  net.hold();
  game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: "game",
    width: 960,
    height: 540,
    pixelArt: true,
    backgroundColor: "#0d1020",
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: [],
  });
  game.scene.add("world", WorldScene, true, { net, state, hud, change: enterWorld } satisfies WorldData);
  (window as unknown as { __htkCharWindow: CharWindow }).__htkCharWindow = cw;
}

setupAuth();
setupCharacters();
void (async () => {
  if (await api.refresh().catch(() => false)) await showCharacters();
  else show("auth");
})();

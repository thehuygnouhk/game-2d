import Phaser from "phaser";
import {
  type Appearance,
  ErrorCode,
  Op,
  type SEnterWorld,
  type SError,
  type SInventoryDelta,
  type SMapChange,
  type SStatsUpdate,
} from "@htk/shared";
import { Connection } from "./net/connection";
import { WorldScene, type WorldData } from "./scenes/WorldScene";
import { GameState } from "./state";
import { Hud } from "./ui/hud";

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const form = $<HTMLFormElement>("join"),
  err = $("err"),
  status = $("status"),
  stage = $("stage");
const wsUrl =
  new URLSearchParams(location.search).get("ws") ??
  import.meta.env.VITE_GAME_WS_URL ??
  `ws://${location.hostname}:7001`;
const JOIN_ERRORS: Record<number, string> = {
  1001: "Phiên bản game cũ, hãy tải lại trang.",
  1002: "Tên không hợp lệ (3–12 chữ hoặc số), hoặc máy chủ chưa mở chế độ khách.",
  2007: "Các khu đều đã đầy, thử lại sau.",
  9000: "Máy chủ gặp lỗi.",
};
/** in-game errors worth telling the player (network-protocol §8); cooldown refusals stay silent */
const GAME_ERRORS: Record<number, string> = {
  [ErrorCode.E_RATE_LIMIT]: "Gửi nhanh quá, chậm lại một chút.",
  [ErrorCode.E_NOT_ENOUGH_MP]: "Thiếu MP.",
  [ErrorCode.E_ZONE_FULL]: "Khu này đã đầy.",
  [ErrorCode.E_IN_COMBAT]: "Đang giao tranh: đợi 5 giây rồi đổi khu.",
  [ErrorCode.E_MAP_LOCKED]: "Vùng này chưa mở ở bản online.",
  [ErrorCode.E_INVENTORY_FULL]: "Túi đầy.",
  [ErrorCode.E_LEVEL_REQUIRED]: "Chưa đủ cấp.",
};

let game: Phaser.Game | null = null;

function startGame(net: Connection, enter: SEnterWorld): void {
  form.hidden = true;
  status.hidden = true;
  net.startPing();
  const state = new GameState(enter);
  const hud = new Hud(stage, state, net);
  hud.chat("SYSTEM", `Chào ${state.name}! Đi qua cổng phải để ra Đồng Hoa đánh quái. Enter để chat cùng khu.`);
  net.on<SStatsUpdate>(Op.S_STATS_UPDATE, (s) => state.applyStats(s));
  net.on<SInventoryDelta>(Op.S_INVENTORY_DELTA, (d) => state.applyInventory(d));
  net.on<SError>(Op.S_ERROR, (e) => {
    const text = GAME_ERRORS[e.code];
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
  game.scene.add("world", WorldScene, true, { net, state, hud, change: enter } satisfies WorldData);
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  err.textContent = "";
  const name = $<HTMLInputElement>("name").value.trim();
  const appearance = {
    origin: $<HTMLSelectElement>("origin").value,
    gender: $<HTMLSelectElement>("gender").value,
  } as Appearance;
  const btn = form.querySelector("button")!;
  btn.disabled = true;
  const net = new Connection(wsUrl);
  const offErr = net.on<SError>(Op.S_ERROR, (p) => {
    if (game) return;
    err.textContent = JOIN_ERRORS[p.code] ?? `Lỗi ${p.code}`;
    btn.disabled = false;
  });
  net.onClose = (reason) => {
    status.hidden = false;
    status.innerHTML = `<span class="bad">● Mất kết nối</span> <em>${reason.replace(/[<>&]/g, "")}. Tải lại trang để vào lại.</em>`;
    if (!game) btn.disabled = false;
  };
  net.on(Op.S_WELCOME, () => net.send(Op.C_ENTER_WORLD));
  net.on<SEnterWorld>(Op.S_ENTER_WORLD, (enter) => {
    offErr();
    startGame(net, enter);
  });
  try {
    await net.connect({ ticket: `guest:${name}`, clientVersion: "0.2.0", appearance });
  } catch (ex) {
    err.textContent = (ex as Error).message;
    btn.disabled = false;
  }
});

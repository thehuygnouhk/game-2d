import Phaser from "phaser";
import { type Appearance, Op, type SEnterWorld, type SError, type SWelcome } from "@htk/shared";
import { Connection } from "./net/connection";
import { WorldScene } from "./scenes/WorldScene";

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const form = $<HTMLFormElement>("join"),
  err = $("err"),
  status = $("status");
const wsUrl =
  new URLSearchParams(location.search).get("ws") ??
  import.meta.env.VITE_GAME_WS_URL ??
  `ws://${location.hostname}:7001`;
const ERRORS: Record<number, string> = {
  1001: "Phiên bản game cũ, hãy tải lại trang.",
  1002: "Tên không hợp lệ (3–12 chữ hoặc số), hoặc máy chủ chưa mở chế độ khách.",
  9000: "Máy chủ gặp lỗi.",
};

let game: Phaser.Game | null = null;

function showStatus(net: Connection, name: string): void {
  status.hidden = false;
  window.setInterval(() => {
    const scene = game?.scene.getScene("world") as WorldScene | null;
    const n = scene?.sys.isActive() ? scene.debug.remotes.length + 1 : 1;
    status.innerHTML = `<span class="ok">● Trực tuyến</span> ${name} · Nhà Học Suối Mơ · Khu 1 · ${n} người <em>· ping ${net.rtt} ms</em>`;
  }, 500);
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
  net.on<SError>(Op.S_ERROR, (p) => {
    err.textContent = ERRORS[p.code] ?? `Lỗi ${p.code}`;
    btn.disabled = false;
  });
  net.onClose = (reason) => {
    status.innerHTML = `<span class="bad">● Mất kết nối</span> <em>${reason}. Tải lại trang để vào lại.</em>`;
    if (!game) btn.disabled = false;
  };
  net.on<SWelcome>(Op.S_WELCOME, () => net.send(Op.C_ENTER_WORLD));
  net.on<SEnterWorld>(Op.S_ENTER_WORLD, (enter) => {
    form.hidden = true;
    net.startPing();
    showStatus(net, enter.character.name);
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
    game.scene.add("world", WorldScene, true, { net, enter });
  });
  try {
    await net.connect({ ticket: `guest:${name}`, clientVersion: "0.1.0", appearance });
  } catch (ex) {
    err.textContent = (ex as Error).message;
    btn.disabled = false;
  }
});

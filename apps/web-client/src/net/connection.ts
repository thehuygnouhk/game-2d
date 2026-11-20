import { type CHello, decodeFrame, encodeFrame, type Frame, Op, opName, PROTOCOL_VERSION } from "@htk/shared";

type Handler = (payload: never, frame: Frame) => void;

/** WebSocket + frame codec + dispatcher + ping (client-design §4). Reconnect arrives with C_RESUME in step B2. */
export class Connection {
  private ws: WebSocket | null = null;
  private seq = 0;
  private readonly handlers = new Map<number, Handler[]>();
  private pingTimer = 0;
  rtt = 0;
  serverOffset = 0;
  onClose: (reason: string) => void = () => {};

  constructor(readonly url: string) {}

  on<T>(op: number, fn: (payload: T, frame: Frame) => void): void {
    const list = this.handlers.get(op) ?? [];
    list.push(fn as Handler);
    this.handlers.set(op, list);
  }

  send(op: number, payload: unknown = {}): number {
    this.seq = (this.seq + 1) >>> 0;
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(encodeFrame(op, this.seq, payload));
    return this.seq;
  }

  connect(hello: Omit<CHello, "protocolVersion" | "contentVersion" | "device">): Promise<void> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(this.url);
      ws.binaryType = "arraybuffer";
      this.ws = ws;
      ws.onopen = () => {
        this.send(Op.C_HELLO, { ...hello, protocolVersion: PROTOCOL_VERSION, contentVersion: "dev", device: "web" });
        resolve();
      };
      ws.onerror = () => reject(new Error(`Không kết nối được máy chủ ${this.url}`));
      ws.onclose = (e) => {
        clearInterval(this.pingTimer);
        this.onClose(e.reason || `đóng (${e.code})`);
      };
      ws.onmessage = (e) => {
        let f: Frame;
        try {
          f = decodeFrame(e.data as ArrayBuffer);
        } catch (err) {
          console.warn("bad frame from server", err);
          return;
        }
        for (const h of this.handlers.get(f.op) ?? []) h(f.payload as never, f);
        if (!this.handlers.has(f.op)) console.debug("unhandled", opName(f.op));
      };
    });
  }

  startPing(): void {
    this.on<{ t: number; serverTime: number }>(Op.S_PONG, (p) => {
      const now = performance.now();
      this.rtt = Math.round(now - p.t);
      this.serverOffset = p.serverTime - (Date.now() - this.rtt / 2);
    });
    const ping = () => this.send(Op.C_PING, { t: performance.now() });
    ping();
    this.pingTimer = window.setInterval(ping, 10_000);
  }

  close(): void {
    this.ws?.close();
  }
}

import { type CHello, decodeFrame, encodeFrame, type Frame, Op, opName, PROTOCOL_VERSION } from "@htk/shared";

type Handler = (payload: never, frame: Frame) => void;

/** WebSocket + frame codec + dispatcher + ping (client-design §4). Reconnect arrives with C_RESUME in step B3. */
export class Connection {
  private ws: WebSocket | null = null;
  private seq = 0;
  private readonly handlers = new Map<number, Handler[]>();
  private pingTimer = 0;
  /** while a scene loads (map change), frames wait here so no spawn or snapshot is lost */
  private held: Frame[] | null = null;
  rtt = 0;
  serverOffset = 0;
  onClose: (reason: string) => void = () => {};

  constructor(readonly url: string) {}

  /** Register a handler; returns a function that removes it. */
  on<T>(op: number, fn: (payload: T, frame: Frame) => void): () => void {
    const list = this.handlers.get(op) ?? [];
    list.push(fn as Handler);
    this.handlers.set(op, list);
    return () => {
      const l = this.handlers.get(op),
        i = l ? l.indexOf(fn as Handler) : -1;
      if (i >= 0) l!.splice(i, 1);
    };
  }

  send(op: number, payload: unknown = {}): number {
    this.seq = (this.seq + 1) >>> 0;
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(encodeFrame(op, this.seq, payload));
    return this.seq;
  }

  hold(): void {
    this.held ??= [];
  }
  release(): void {
    const frames = this.held ?? [];
    this.held = null;
    for (const f of frames) this.dispatch(f);
  }

  private dispatch(f: Frame): void {
    if (this.held) {
      this.held.push(f);
      return;
    }
    const list = this.handlers.get(f.op);
    for (const h of [...(list ?? [])]) h(f.payload as never, f);
    if (!list?.length) console.debug("unhandled", opName(f.op));
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
        this.dispatch(f);
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

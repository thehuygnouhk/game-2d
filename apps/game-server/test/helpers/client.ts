import { WebSocket } from "ws";
import { decodeFrame, encodeFrame, type Frame, Op, PROTOCOL_VERSION, type SEnterWorld } from "@htk/shared";

/** A bare protocol client for server tests. */
export class Client {
  readonly frames: Frame[] = [];
  private seq = 0;
  closed = false;
  constructor(readonly ws: WebSocket) {
    ws.on("message", (d) => this.frames.push(decodeFrame(d as Buffer)));
    ws.on("close", () => (this.closed = true));
  }
  static async open(port: number): Promise<Client> {
    const ws = new WebSocket(`ws://127.0.0.1:${port}`);
    await new Promise((res, rej) => {
      ws.once("open", res);
      ws.once("error", rej);
    });
    return new Client(ws);
  }
  send(op: number, payload: unknown = {}): number {
    this.ws.send(encodeFrame(op, ++this.seq, payload));
    return this.seq;
  }
  hello(name: string, protocolVersion = PROTOCOL_VERSION, origin = "NOBLE") {
    return this.send(Op.C_HELLO, {
      ticket: `guest:${name}`,
      clientVersion: "test",
      protocolVersion,
      appearance: { origin, gender: "FEMALE" },
    });
  }
  async wait<T = never>(op: number, pred: (p: T) => boolean = () => true, ms = 3000): Promise<T> {
    const until = Date.now() + ms;
    for (;;) {
      const f = this.frames.find((x) => x.op === op && pred(x.payload as T));
      if (f) return f.payload as T;
      if (Date.now() > until) throw new Error(`timeout waiting for 0x${op.toString(16)}`);
      await new Promise((r) => setTimeout(r, 10));
    }
  }
  /** wait for a frame that arrives after this call */
  async next<T = never>(op: number, pred: (p: T) => boolean = () => true, ms = 3000): Promise<T> {
    const start = this.frames.length;
    const until = Date.now() + ms;
    for (;;) {
      const f = this.frames.slice(start).find((x) => x.op === op && pred(x.payload as T));
      if (f) return f.payload as T;
      if (Date.now() > until) throw new Error(`timeout waiting for 0x${op.toString(16)}`);
      await new Promise((r) => setTimeout(r, 10));
    }
  }
  async join(name: string, origin = "NOBLE"): Promise<SEnterWorld> {
    this.hello(name, PROTOCOL_VERSION, origin);
    await this.wait(Op.S_WELCOME);
    this.send(Op.C_ENTER_WORLD);
    return await this.wait<SEnterWorld>(Op.S_ENTER_WORLD);
  }
  /** sign in with an API ticket and enter the world */
  async enter(ticket: string): Promise<SEnterWorld> {
    this.send(Op.C_HELLO, { ticket, clientVersion: "test", protocolVersion: PROTOCOL_VERSION });
    await this.wait(Op.S_WELCOME);
    this.send(Op.C_ENTER_WORLD);
    return await this.wait<SEnterWorld>(Op.S_ENTER_WORLD);
  }
  close() {
    this.ws.close();
  }
}

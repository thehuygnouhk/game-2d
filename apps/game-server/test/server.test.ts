import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { WebSocket } from "ws";
import {
  decodeFrame,
  encodeFrame,
  ErrorCode,
  type Frame,
  Op,
  PROTOCOL_VERSION,
  type SEnterWorld,
  type SSnapshot,
} from "@htk/shared";
import { DEFAULT_MAP_DIR } from "../src/config";
import { type GameServer, startGameServer } from "../src/server";

class Client {
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
  hello(name: string, protocolVersion = PROTOCOL_VERSION) {
    return this.send(Op.C_HELLO, {
      ticket: `guest:${name}`,
      clientVersion: "test",
      protocolVersion,
      appearance: { origin: "NOBLE", gender: "FEMALE" },
    });
  }
  async wait(op: number, pred: (p: never) => boolean = () => true, ms = 3000): Promise<Frame> {
    const until = Date.now() + ms;
    for (;;) {
      const f = this.frames.find((x) => x.op === op && pred(x.payload as never));
      if (f) return f;
      if (Date.now() > until) throw new Error(`timeout waiting for 0x${op.toString(16)}`);
      await new Promise((r) => setTimeout(r, 10));
    }
  }
  async join(name: string): Promise<SEnterWorld> {
    this.hello(name);
    await this.wait(Op.S_WELCOME);
    this.send(Op.C_ENTER_WORLD);
    return (await this.wait(Op.S_ENTER_WORLD)).payload as SEnterWorld;
  }
  close() {
    this.ws.close();
  }
}

let server: GameServer;
const logs: string[] = [];
const start = (devGuest = true) =>
  startGameServer({ port: 0, mapDir: DEFAULT_MAP_DIR, mapId: "M001", devGuest, log: (e) => logs.push(e) });
beforeAll(async () => {
  server = await start();
});
afterAll(async () => {
  await server.close();
});

describe("game server, step B1", () => {
  it("two players enter M001 and see each other", async () => {
    const a = await Client.open(server.port),
      b = await Client.open(server.port);
    const wa = await a.join("Anh");
    expect(wa.map).toEqual({ id: "M001", zone: 1 });
    expect(wa.entities).toEqual([]);
    expect(wa.body.st).toBeLessThan(2); // landed on the ground
    const wb = await b.join("Bình");
    expect(wb.entities.map((e) => e.name)).toEqual(["Anh"]);
    const spawn = await a.wait(Op.S_ENTITY_SPAWN, (p: { name: string }) => p.name === "Bình");
    expect((spawn.payload as { appearance: unknown }).appearance).toEqual({ origin: "NOBLE", gender: "FEMALE" });
    // An walks right for 20 ticks: Bình sees An 180 px further, An gets its inputs acknowledged
    let last = 0;
    for (let i = 0; i < 20; i++) {
      last = a.send(Op.C_MOVE_INPUT, { seq: i + 1, dir: 1, jump: 0, down: 0, tickClient: i });
      await new Promise((r) => setTimeout(r, 50));
    }
    await a.wait(Op.S_SNAPSHOT, (p: SSnapshot) => p.ack === 20);
    const seen = await b.wait(Op.S_SNAPSHOT, (p: SSnapshot) =>
      p.ents.some((e) => e.id === wa.you && e.x === wa.body.x + 180),
    );
    expect(seen).toBeTruthy();
    expect(last).toBeGreaterThan(0);
    // An leaves: Bình gets a despawn
    a.close();
    const gone = await b.wait(Op.S_ENTITY_DESPAWN);
    expect((gone.payload as { ids: number[] }).ids).toEqual([wa.you]);
    b.close();
  });

  it("does not let a client fast-forward by flooding inputs", async () => {
    const c = await Client.open(server.port);
    const w = await c.join("Cường");
    const t0 = server.zone.tick;
    for (let i = 1; i <= 80; i++) c.send(Op.C_MOVE_INPUT, { seq: i, dir: 1, jump: 0, down: 0, tickClient: i });
    await new Promise((r) => setTimeout(r, 600));
    const p = server.zone.players.get(w.you)!;
    const ticks = server.zone.tick - t0;
    // one step per tick plus the 3-step jitter budget, never the 80 steps the client asked for
    expect(p.body.x - w.body.x).toBeLessThanOrEqual((ticks + 3) * 9);
    expect(p.body.x - w.body.x).toBeLessThan(80 * 9);
    c.close();
  });

  it("rejects an old protocol version with E_VERSION", async () => {
    const c = await Client.open(server.port);
    c.hello("Dũng", PROTOCOL_VERSION + 5);
    const e = await c.wait(Op.S_ERROR);
    expect((e.payload as { code: number }).code).toBe(ErrorCode.E_VERSION);
    await new Promise((r) => setTimeout(r, 100));
    expect(c.closed).toBe(true);
  });

  it("closes a connection after three invalid packets", async () => {
    const c = await Client.open(server.port);
    for (let i = 0; i < 3; i++) c.ws.send(new Uint8Array([9, 9, 9]));
    await new Promise((r) => setTimeout(r, 200));
    expect(c.frames.filter((f) => f.op === Op.S_ERROR)).toHaveLength(3);
    expect(c.closed).toBe(true);
  });

  it("refuses bad guest names and, without DEV_GUEST, every ticket", async () => {
    const c = await Client.open(server.port);
    c.send(Op.C_HELLO, { ticket: "guest:<x>", clientVersion: "t", protocolVersion: PROTOCOL_VERSION });
    expect(((await c.wait(Op.S_ERROR)).payload as { code: number }).code).toBe(ErrorCode.E_AUTH);
    const locked = await start(false);
    const d = await Client.open(locked.port);
    d.hello("Giang");
    expect(((await d.wait(Op.S_ERROR)).payload as { code: number }).code).toBe(ErrorCode.E_AUTH);
    await locked.close();
  });
});

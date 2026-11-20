import { describe, expect, it } from "vitest";
import { decodeFrame, encodeFrame, FrameError, MAX_FRAME_BYTES, Op } from "../src";

describe("frame codec (network-protocol §2)", () => {
  it("round-trips header and MessagePack payload", () => {
    const f = decodeFrame(encodeFrame(Op.C_MOVE_INPUT, 4_000_000_000, { seq: 7, dir: -1, jump: 1 }));
    expect(f).toEqual({ ver: 1, op: Op.C_MOVE_INPUT, seq: 4_000_000_000, payload: { seq: 7, dir: -1, jump: 1 } });
  });
  it("uses a 7 byte big-endian header", () => {
    const b = encodeFrame(0x0102, 1, {});
    expect([...b.slice(0, 7)]).toEqual([1, 0x01, 0x02, 0, 0, 0, 1]);
  });
  it("rejects short, oversized and wrong-version frames", () => {
    expect(() => decodeFrame(new Uint8Array(3))).toThrow(FrameError);
    expect(() => decodeFrame(new Uint8Array(MAX_FRAME_BYTES + 1))).toThrow(FrameError);
    const b = encodeFrame(Op.C_PING, 1, { t: 1 });
    b[0] = 9;
    expect(() => decodeFrame(b)).toThrow(/version/);
  });
  it("refuses to build frames over 16 KB", () => {
    expect(() => encodeFrame(Op.S_SNAPSHOT, 1, { blob: "x".repeat(MAX_FRAME_BYTES) })).toThrow(RangeError);
  });
});

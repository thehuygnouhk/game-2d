import { decode, encode } from "@msgpack/msgpack";
import { FRAME_VERSION, MAX_FRAME_BYTES } from "../constants";

/**
 * Frame: ver u8 | op u16 | seq u32 | payload (MessagePack), big endian
 * (docs/architecture/network-protocol.md §2).
 */
export interface Frame {
  ver: number;
  op: number;
  seq: number;
  payload: unknown;
}

const HEADER = 7;

export function encodeFrame(op: number, seq: number, payload: unknown = {}): Uint8Array {
  const body = encode(payload);
  const out = new Uint8Array(HEADER + body.byteLength);
  const dv = new DataView(out.buffer);
  dv.setUint8(0, FRAME_VERSION);
  dv.setUint16(1, op);
  dv.setUint32(3, seq >>> 0);
  out.set(body, HEADER);
  if (out.byteLength > MAX_FRAME_BYTES) throw new RangeError(`frame too large: ${out.byteLength} bytes`);
  return out;
}

export class FrameError extends Error {}

export function decodeFrame(data: ArrayBuffer | Uint8Array): Frame {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  if (bytes.byteLength < HEADER) throw new FrameError("frame shorter than header");
  if (bytes.byteLength > MAX_FRAME_BYTES) throw new FrameError("frame larger than 16 KB");
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const ver = dv.getUint8(0);
  if (ver !== FRAME_VERSION) throw new FrameError(`unknown frame version ${ver}`);
  const op = dv.getUint16(1);
  const seq = dv.getUint32(3);
  let payload: unknown = {};
  if (bytes.byteLength > HEADER) {
    try {
      payload = decode(bytes.subarray(HEADER));
    } catch {
      throw new FrameError("payload is not valid MessagePack");
    }
  }
  return { ver, op, seq, payload };
}

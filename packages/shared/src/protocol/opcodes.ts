/** Opcodes in use (docs/architecture/network-protocol.md §6). C = client → server, S = server → client. */
export const Op = {
  C_HELLO: 0x0101,
  S_WELCOME: 0x0102,
  C_PING: 0x0103,
  S_PONG: 0x0104,
  S_KICK: 0x0105,
  S_ERROR: 0x01ff,
  C_ENTER_WORLD: 0x0201,
  S_ENTER_WORLD: 0x0202,
  C_MOVE_INPUT: 0x0301,
  S_SNAPSHOT: 0x0302,
  S_ENTITY_SPAWN: 0x0303,
  S_ENTITY_DESPAWN: 0x0304,
} as const;
export type Opcode = (typeof Op)[keyof typeof Op];
const NAMES = new Map<number, string>(Object.entries(Op).map(([k, v]) => [v, k]));
export const opName = (op: number): string => NAMES.get(op) ?? `0x${op.toString(16).padStart(4, "0")}`;

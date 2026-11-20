import { z } from "zod";
import { Op } from "./opcodes";

/**
 * Payload schemas for the step B1 slice of the protocol (docs/architecture/network-protocol.md §3, §5, §6.1-6.3).
 * Every client payload is validated on the server; server payloads are typed for the client.
 */
export const Appearance = z.object({
  origin: z.enum(["VILLAGER", "NOBLE", "ANCIENT"]),
  gender: z.enum(["MALE", "FEMALE"]),
});
export type Appearance = z.infer<typeof Appearance>;

/** Character names follow docs/game-design/03-origins-classes-skills.md §2.1. */
export const CharacterName = z
  .string()
  .transform((s) => s.trim().replace(/\s+/g, " "))
  .pipe(
    z
      .string()
      .min(3)
      .max(12)
      .regex(/^[\p{L}\p{N}]+( [\p{L}\p{N}]+)*$/u),
  );

export const CHello = z.object({
  ticket: z.string().min(1).max(256),
  clientVersion: z.string().max(32),
  protocolVersion: z.number().int(),
  contentVersion: z.string().max(64).default("dev"),
  device: z.string().max(64).default("web"),
  appearance: Appearance.optional(),
});
export type CHello = z.infer<typeof CHello>;

export const CMoveInput = z.object({
  seq: z.number().int().nonnegative(),
  dir: z.union([z.literal(-1), z.literal(0), z.literal(1)]),
  jump: z.union([z.literal(0), z.literal(1)]),
  down: z.union([z.literal(0), z.literal(1)]),
  tickClient: z.number().int().nonnegative(),
});
export type CMoveInput = z.infer<typeof CMoveInput>;

export const CPing = z.object({ t: z.number() });
export const CEnterWorld = z.object({}).passthrough();

export const ClientSchemas: Record<number, z.ZodTypeAny> = {
  [Op.C_HELLO]: CHello,
  [Op.C_PING]: CPing,
  [Op.C_ENTER_WORLD]: CEnterWorld,
  [Op.C_MOVE_INPUT]: CMoveInput,
};

/** Animation state carried in snapshots (`st`). Ground states are < 2. */
export const MoveState = { IDLE: 0, RUN: 1, JUMP: 2, FALL: 3 } as const;

export interface SWelcome {
  serverTime: number;
  tickRate: number;
  snapshotRate: number;
  resumeToken: string;
  config: { mapId: string };
}
export interface EntitySpawn {
  id: number;
  kind: "player";
  name: string;
  appearance: Appearance;
  x: number;
  y: number;
  st: number;
  f: 1 | -1;
}
export interface EntityDelta {
  id: number;
  x?: number;
  y?: number;
  vy?: number; // int8 x 8 (px/s)
  st?: number;
  f?: 1 | -1;
}
export interface SEnterWorld {
  you: number;
  character: { name: string; appearance: Appearance };
  map: { id: string; zone: number };
  tick: number;
  body: { x: number; y: number; vy: number; st: number };
  entities: EntitySpawn[];
}
export interface SSnapshot {
  tick: number;
  ack: number;
  ents: EntityDelta[];
}
export interface SEntityDespawn {
  ids: number[];
}
export interface SError {
  code: number;
  refSeq: number;
  message?: string;
}

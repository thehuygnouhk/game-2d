import { MoveState } from "../protocol/messages";
import { type CollisionMap, TILE, Tile, tileAt } from "./tilemap";

/**
 * Deterministic platformer step shared by the client (prediction) and the server (authority).
 * docs/architecture/server-design.md §4: fixed 50 ms steps, AABB vs tiles, one-way platforms.
 * Values follow the tested browser prototype and the V016 map rule (jump up to 3 tiles).
 */
export const PHYS = {
  W: 24,
  H: 48,
  SPEED: 180, // px/s (combat §3.2)
  GRAVITY: 1200, // px/s²
  JUMP: 544, // px/s, multiple of 8 (int8 x 8): 103 px high with 50 ms steps, like the prototype (104 px)
  MAX_FALL: 960, // px/s
  DT: 0.05, // s, one server tick
  DROP_TICKS: 6, // ignore one-way tiles this long after pressing down on one
} as const;

/** Feet-centred body: x = centre, y = bottom edge. All fields are integers after every step. */
export interface Body {
  x: number;
  y: number;
  vy: number;
  ground: boolean;
  drop: number;
  facing: 1 | -1;
}
export interface MoveInput {
  dir: -1 | 0 | 1;
  jump: boolean;
  down: boolean;
}

const HALF = PHYS.W / 2;
const cols = (x: number): [number, number] => [Math.floor((x - HALF) / TILE), Math.floor((x + HALF - 1) / TILE)];

function blockedX(m: CollisionMap, x: number, y: number, dir: number): number | null {
  const top = Math.floor((y - PHYS.H) / TILE),
    bot = Math.floor((y - 1) / TILE);
  const col = dir > 0 ? Math.floor((x + HALF - 1) / TILE) : Math.floor((x - HALF) / TILE);
  for (let r = top; r <= bot; r++)
    if (tileAt(m, col, r) === Tile.SOLID) return dir > 0 ? col * TILE - HALF : (col + 1) * TILE + HALF;
  return null;
}

function supportAt(m: CollisionMap, x: number, y: number, drop: number): boolean {
  if (y % TILE !== 0) return false;
  const row = y / TILE;
  const [c0, c1] = cols(x);
  for (let c = c0; c <= c1; c++) {
    const t = tileAt(m, c, row);
    if (t === Tile.SOLID || (t === Tile.ONE_WAY && drop === 0)) return true;
  }
  return false;
}

function onOneWay(m: CollisionMap, x: number, y: number): boolean {
  if (y % TILE !== 0) return false;
  const [c0, c1] = cols(x);
  let oneWay = false;
  for (let c = c0; c <= c1; c++) {
    const t = tileAt(m, c, y / TILE);
    if (t === Tile.SOLID) return false;
    if (t === Tile.ONE_WAY) oneWay = true;
  }
  return oneWay;
}

export function step(m: CollisionMap, b: Body, inp: MoveInput): Body {
  let { x, y, vy, ground, drop } = b;
  const facing: 1 | -1 = inp.dir !== 0 ? inp.dir : b.facing;
  // horizontal
  if (inp.dir !== 0) {
    const nx = x + inp.dir * PHYS.SPEED * PHYS.DT;
    const wall = blockedX(m, nx, y, inp.dir);
    x = wall === null ? nx : wall;
    x = Math.min(Math.max(x, HALF), m.width * TILE - HALF);
  }
  if (ground && !supportAt(m, x, y, drop)) ground = false;
  // jump / drop through a one-way tile
  if (ground && inp.down && onOneWay(m, x, y)) {
    ground = false;
    drop = PHYS.DROP_TICKS;
  } else if (ground && inp.jump) {
    ground = false;
    vy = -PHYS.JUMP;
  }
  // vertical
  if (!ground) {
    vy = Math.min(PHYS.MAX_FALL, vy + PHYS.GRAVITY * PHYS.DT);
    vy = Math.round(vy / 8) * 8;
    const ny = y + vy * PHYS.DT;
    if (vy > 0) {
      let landed = false;
      for (let row = Math.floor(y / TILE) + (y % TILE === 0 ? 0 : 1); row * TILE <= ny; row++) {
        const [c0, c1] = cols(x);
        for (let c = c0; c <= c1 && !landed; c++) {
          const t = tileAt(m, c, row);
          if (t === Tile.SOLID || (t === Tile.ONE_WAY && drop === 0 && y <= row * TILE)) landed = true;
        }
        if (landed) {
          y = row * TILE;
          vy = 0;
          ground = true;
          break;
        }
      }
      if (!landed) y = ny;
    } else {
      const head = ny - PHYS.H;
      const row = Math.floor(head / TILE);
      const [c0, c1] = cols(x);
      let hit = false;
      for (let c = c0; c <= c1; c++) if (tileAt(m, c, row) === Tile.SOLID) hit = true;
      if (hit) {
        y = (row + 1) * TILE + PHYS.H;
        vy = 0;
      } else y = ny;
    }
  }
  if (drop > 0) drop--;
  y = Math.min(Math.round(y), m.height * TILE);
  if (y >= m.height * TILE) {
    ground = true;
    vy = 0;
  } // safety floor below the map
  return { x: Math.round(x), y, vy, ground, drop, facing };
}

export function moveState(b: Body, dir: number): number {
  if (!b.ground) return b.vy < 0 ? MoveState.JUMP : MoveState.FALL;
  return dir !== 0 ? MoveState.RUN : MoveState.IDLE;
}

export function makeBody(x: number, y: number): Body {
  return { x, y, vy: 0, ground: false, drop: 0, facing: 1 };
}

import { MoveState } from "../protocol/messages";
import { type CollisionMap, TILE, Tile, tileAt } from "./tilemap";

/**
 * Deterministic platformer step shared by the client (prediction) and the server (authority).
 * docs/architecture/server-design.md §4: fixed 50 ms steps, AABB vs tiles, one-way platforms, ladders, hazards.
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
  CLIMB_Y: 6, // px per tick on a ladder (120 px/s, combat §4.5)
  CLIMB_X: 4, // px per tick sideways on a ladder (about 0.4 x run speed, like the prototype)
  BOUNCE: 384, // px/s thrown up by a hazard tile (multiple of 8)
} as const;

/** Feet-centred body: x = centre, y = bottom edge. All fields are integers after every step. */
export interface Body {
  x: number;
  y: number;
  vy: number;
  ground: boolean;
  drop: number;
  facing: 1 | -1;
  climb: boolean;
  /** true on a tick the feet touched a hazard tile (the server applies the damage) */
  hazard?: boolean;
}
export interface MoveInput {
  dir: -1 | 0 | 1;
  jump: boolean;
  down: boolean;
  /** up: climb a ladder (and use a portal, handled outside the physics) */
  up?: boolean;
}

const HALF = PHYS.W / 2;
const cols = (x: number): [number, number] => [Math.floor((x - HALF) / TILE), Math.floor((x + HALF - 1) / TILE)];
const centreCol = (x: number) => Math.floor(x / TILE);

function blockedX(m: CollisionMap, x: number, y: number, dir: number): number | null {
  const top = Math.floor((y - PHYS.H) / TILE),
    bot = Math.floor((y - 1) / TILE);
  const col = dir > 0 ? Math.floor((x + HALF - 1) / TILE) : Math.floor((x - HALF) / TILE);
  for (let r = top; r <= bot; r++)
    if (tileAt(m, col, r) === Tile.SOLID) return dir > 0 ? col * TILE - HALF : (col + 1) * TILE + HALF;
  return null;
}

/** A ladder tile, or the one-way tile a ladder leads up into. */
function climbable(m: CollisionMap, c: number, r: number): boolean {
  const t = tileAt(m, c, r);
  return t === Tile.LADDER || (t === Tile.ONE_WAY && tileAt(m, c, r + 1) === Tile.LADDER);
}
/** The top of a ladder that ends in open air can be stood on, like a one-way tile. */
function ladderTop(m: CollisionMap, c: number, r: number): boolean {
  if (tileAt(m, c, r) !== Tile.LADDER) return false;
  const above = tileAt(m, c, r - 1);
  return above !== Tile.LADDER && above !== Tile.ONE_WAY;
}
const standOn = (m: CollisionMap, c: number, r: number, drop: number) => {
  const t = tileAt(m, c, r);
  return t === Tile.SOLID || (drop === 0 && (t === Tile.ONE_WAY || ladderTop(m, c, r)));
};

function supportAt(m: CollisionMap, x: number, y: number, drop: number): boolean {
  if (y % TILE !== 0) return false;
  const [c0, c1] = cols(x);
  for (let c = c0; c <= c1; c++) if (standOn(m, c, y / TILE, drop)) return true;
  return false;
}

/** Standing on thin ground only (one-way or ladder top), so pressing down drops through. */
function onThin(m: CollisionMap, x: number, y: number): boolean {
  if (y % TILE !== 0) return false;
  const [c0, c1] = cols(x);
  let thin = false;
  for (let c = c0; c <= c1; c++) {
    const t = tileAt(m, c, y / TILE);
    if (t === Tile.SOLID) return false;
    if (t === Tile.ONE_WAY || ladderTop(m, c, y / TILE)) thin = true;
  }
  return thin;
}

/** Does the body overlap a climbable tile in its centre column? */
function onLadder(m: CollisionMap, x: number, y: number): boolean {
  const c = centreCol(x);
  for (let r = Math.floor((y - PHYS.H) / TILE); r <= Math.floor((y - 1) / TILE); r++)
    if (climbable(m, c, r)) return true;
  return false;
}

function onHazard(m: CollisionMap, x: number, y: number): boolean {
  const [c0, c1] = cols(x),
    r = Math.floor((y - 1) / TILE);
  for (let c = c0; c <= c1; c++) if (tileAt(m, c, r) === Tile.HAZARD) return true;
  return false;
}

function climbStep(m: CollisionMap, b: Body, inp: MoveInput): Body {
  let { x, y } = b;
  const facing: 1 | -1 = inp.dir !== 0 ? inp.dir : b.facing;
  if (inp.dir !== 0) {
    const nx = x + inp.dir * PHYS.CLIMB_X;
    const wall = blockedX(m, nx, y, inp.dir);
    x = wall === null ? nx : wall;
  }
  const c = centreCol(x);
  if (inp.up && !inp.down) {
    // the top of this ladder: topmost climbable row of the column above the feet
    let top = Math.floor((y - 1) / TILE);
    while (climbable(m, c, top - 1)) top--;
    const ny = y - PHYS.CLIMB_Y;
    const head = Math.floor((ny - PHYS.H) / TILE);
    const [c0, c1] = cols(x);
    let bump = false;
    for (let cc = c0; cc <= c1; cc++) if (tileAt(m, cc, head) === Tile.SOLID) bump = true;
    if (!bump) {
      if (climbable(m, c, top) && ny <= top * TILE) {
        // stepped off the top: stand on the platform (or the ladder top) above
        return { x, y: top * TILE, vy: 0, ground: true, drop: 0, facing, climb: false };
      }
      y = ny;
    }
  } else if (inp.down && !inp.up) {
    const ny = y + PHYS.CLIMB_Y;
    const [c0, c1] = cols(x);
    for (let row = Math.floor(y / TILE) + (y % TILE === 0 ? 0 : 1); row * TILE <= ny; row++)
      for (let cc = c0; cc <= c1; cc++)
        if (tileAt(m, cc, row) === Tile.SOLID && y <= row * TILE)
          return { x, y: row * TILE, vy: 0, ground: true, drop: 0, facing, climb: false }; // reached the floor
    y = ny;
  }
  if (!onLadder(m, x, y)) return { x, y, vy: 0, ground: false, drop: 0, facing, climb: false }; // stepped off sideways
  return { x, y, vy: 0, ground: false, drop: 0, facing, climb: true };
}

export function step(m: CollisionMap, b: Body, inp: MoveInput): Body {
  // ladders: up or down on a ladder grabs it (centred on the ladder); jump lets go. Away from a ladder, up jumps.
  const ladder = onLadder(m, b.x, b.y);
  if (b.climb && !inp.jump && ladder) return climbStep(m, b, inp);
  if (!b.climb && !inp.jump) {
    const c = centreCol(b.x),
      feetRow = b.y / TILE;
    const grabUp = inp.up && ladder;
    const grabDown =
      inp.down && b.ground && b.y % TILE === 0 && climbable(m, c, feetRow + (climbable(m, c, feetRow) ? 0 : 1));
    if (grabUp || grabDown) {
      const centred: Body = { ...b, x: c * TILE + TILE / 2, vy: 0, ground: false, drop: 0, climb: true };
      if (blockedX(m, centred.x, centred.y, Math.sign(centred.x - b.x) || 1) === null)
        return climbStep(m, centred, inp);
    }
  }

  let { x, y, vy, ground, drop } = b;
  let hazard = false;
  const facing: 1 | -1 = inp.dir !== 0 ? inp.dir : b.facing;
  // horizontal
  if (inp.dir !== 0) {
    const nx = x + inp.dir * PHYS.SPEED * PHYS.DT;
    const wall = blockedX(m, nx, y, inp.dir);
    x = wall === null ? nx : wall;
    x = Math.min(Math.max(x, HALF), m.width * TILE - HALF);
  }
  if (ground && !supportAt(m, x, y, drop)) ground = false;
  // jump / drop through thin ground / thrown up by a hazard
  if (ground && inp.down && onThin(m, x, y)) {
    ground = false;
    drop = PHYS.DROP_TICKS;
  } else if (ground && (inp.jump || inp.up)) {
    ground = false;
    vy = -PHYS.JUMP;
  } else if (ground && onHazard(m, x, y)) {
    ground = false;
    vy = -PHYS.BOUNCE;
    hazard = true;
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
          if (t === Tile.SOLID || (drop === 0 && y <= row * TILE && (t === Tile.ONE_WAY || ladderTop(m, c, row))))
            landed = true;
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
  const out: Body = { x: Math.round(x), y, vy, ground, drop, facing, climb: false };
  if (hazard) out.hazard = true;
  return out;
}

export function moveState(b: Body, dir: number): number {
  if (b.climb) return MoveState.CLIMB;
  if (!b.ground) return b.vy < 0 ? MoveState.JUMP : MoveState.FALL;
  return dir !== 0 ? MoveState.RUN : MoveState.IDLE;
}

export function makeBody(x: number, y: number): Body {
  return { x, y, vy: 0, ground: false, drop: 0, facing: 1, climb: false };
}

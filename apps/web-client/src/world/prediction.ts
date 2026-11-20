import { type Body, type CollisionMap, type MoveInput, step } from "@htk/shared";

interface Pending {
  seq: number;
  input: MoveInput;
}

/**
 * Local player prediction and server reconciliation (client-design §5.1).
 * The same `step` runs on the server, so replaying unacknowledged inputs reproduces the server result.
 */
export class Predictor {
  body: Body;
  prev: Body;
  private pending: Pending[] = [];
  corrections = 0;

  constructor(
    private readonly map: CollisionMap,
    start: Body,
  ) {
    this.body = start;
    this.prev = start;
  }

  apply(seq: number, input: MoveInput): void {
    this.prev = this.body;
    this.body = step(this.map, this.body, input);
    this.pending.push({ seq, input });
    if (this.pending.length > 120) this.pending.shift();
  }

  /** server: authoritative body after processing input `ack`. Returns the error in px before correcting. */
  reconcile(ack: number, server: Body): number {
    this.pending = this.pending.filter((p) => p.seq > ack);
    let b = server;
    for (const p of this.pending) b = step(this.map, b, p.input);
    const err = Math.hypot(b.x - this.body.x, b.y - this.body.y);
    if (err > 0) {
      if (err > 6) this.corrections++;
      // small errors are folded into the render lerp; large ones snap (client-design §5.1)
      this.prev = err > 6 ? b : this.prev;
      this.body = b;
    }
    return err;
  }

  get unacked(): number {
    return this.pending.length;
  }
}

/** Other entities: 100 ms interpolation buffer, up to 200 ms extrapolation (client-design §5.2). */
export interface Sample {
  t: number; // local receive time (ms)
  x: number;
  y: number;
  st: number;
  f: 1 | -1;
}

export const INTERP_DELAY = 100;
const MAX_EXTRAPOLATE = 200;

export class RemoteTrack {
  private samples: Sample[] = [];

  push(s: Sample): void {
    this.samples.push(s);
    if (this.samples.length > 30) this.samples.shift();
  }

  get latest(): Sample | undefined {
    return this.samples[this.samples.length - 1];
  }

  sample(now: number): Sample | undefined {
    const t = now - INTERP_DELAY,
      s = this.samples;
    if (!s.length) return undefined;
    const first = s[0]!;
    if (t <= first.t) return first;
    for (let i = s.length - 1; i > 0; i--) {
      const a = s[i - 1]!,
        b = s[i]!;
      if (t >= a.t && t <= b.t) {
        const k = b.t === a.t ? 1 : (t - a.t) / (b.t - a.t);
        return { t, x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, st: b.st, f: b.f };
      }
    }
    const last = s[s.length - 1]!,
      prev = s[s.length - 2];
    if (!prev) return last;
    const dt = Math.min(t - last.t, MAX_EXTRAPOLATE),
      span = last.t - prev.t || 1;
    return {
      t,
      x: last.x + ((last.x - prev.x) / span) * dt,
      y: last.y + ((last.y - prev.y) / span) * dt,
      st: last.st,
      f: last.f,
    };
  }
}

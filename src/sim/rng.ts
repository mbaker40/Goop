/**
 * rng.ts — seeded, deterministic RNG (PLAN §10 architecture rule #1).
 * mulberry32: tiny, fast, good enough for gameplay/event rolls; fully reproducible.
 */

export class Rng {
  private state: number;

  constructor(seed: number) {
    // Avoid a zero state; mix the seed a little.
    this.state = (seed >>> 0) || 0x9e3779b9;
  }

  /** Next float in [0, 1). */
  next(): number {
    this.state |= 0;
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Integer in [min, max]. */
  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  /** Float in [min, max). */
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  /** True with probability p. */
  chance(p: number): boolean {
    return this.next() < p;
  }

  /** Serialize/restore so RNG survives a save round-trip. */
  getState(): number {
    return this.state;
  }
  setState(s: number): void {
    this.state = s | 0;
  }
}

/**
 * events.ts — chaos-event scheduler interface (PLAN §8).
 * M0 STUB: the scheduler exists and is deterministic, but the event pool is empty.
 * Real events (Goop Meteor, Health Inspector, Golden Goobers…) land in Milestone 3.
 * Kept here so game wiring and saves already have a home for event state.
 */

import type { Rng } from './rng';

export interface ChaosEventDef {
  id: string;
  name: string;
  minZone: number;
  durationSec: number;
}

export interface ActiveEvent {
  def: ChaosEventDef;
  remaining: number;
}

/** Deterministic scheduler; no-op until the event pool is populated in M3. */
export class EventScheduler {
  private cooldown: number;
  active: ActiveEvent | null = null;

  constructor(private readonly rng: Rng) {
    // Random-ish first gap so events don't fire on tick 1 (PLAN §8: 45s min gap).
    this.cooldown = 45 + this.rng.range(75, 165);
  }

  /** Advance the scheduler. Returns a newly-triggered event, if any (always null in M0). */
  tick(dt: number, _currentZone: number): ActiveEvent | null {
    if (this.active) {
      this.active.remaining -= dt;
      if (this.active.remaining <= 0) this.active = null;
      return null;
    }
    this.cooldown -= dt;
    // M0: pool is empty, so nothing ever fires. Structure is ready for M3.
    return null;
  }
}

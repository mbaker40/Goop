/**
 * mockState.ts — a scriptable mock RenderSource (PLAN §16.2, §17).
 * Lets the renderer be exercised in isolation (via `?mockrender`) without running the sim:
 * ramps height 0→WIN across all 7 zones, cycles run.status, sweeps combo, and hits the
 * Infinity-buffer (no-melt) case. Self-drives on rAF.
 */

import { zoneForHeight, WIN_HEIGHT, type ZoneDef } from '../config/zones';
import type { RenderSource, RenderGame, RenderRun, RunStatus, Screen } from './source';

const CYCLE_SEC = 44; // full scripted timeline length

export class MockSource implements RenderSource {
  screen: Screen = 'run';
  private hv = 0;
  private elapsed = 0;
  private raf = 0;
  private last = 0;
  readonly run: RenderRun = { status: 'grace', combo: 1, collapseTimer: 0, peakHeightRaw: 0, clicks: 0 };
  private clickAccum = 0;
  readonly game: RenderGame;

  constructor() {
    this.game = {
      heightRaw: () => this.hv,
      currentZone: (): ZoneDef => zoneForHeight(this.hv),
      bufferSeconds: () => (this.run.status === 'active' ? 40 : Infinity),
      run: this.run,
    };
  }

  subscribe(_fn: () => void): () => void {
    return () => {};
  }

  /** Advance the scripted timeline by dt seconds. */
  update(dt: number): void {
    this.elapsed += dt;
    const t = this.elapsed % CYCLE_SEC;

    // Height ramps 0 → just past WIN over the first 30s, then holds.
    this.hv = Math.min(WIN_HEIGHT + 2, (t / 30) * (WIN_HEIGHT + 2));
    if (this.hv > this.run.peakHeightRaw) this.run.peakHeightRaw = this.hv;

    // Status timeline: grace → active → collapsing → dead → (loop resets to grace).
    let status: RunStatus;
    if (t < 3) status = 'grace';
    else if (t < 34) status = 'active';
    else if (t < 38) status = 'collapsing';
    else status = 'dead';
    this.run.status = status;
    this.run.collapseTimer = status === 'collapsing' ? 38 - t : 0;

    // Combo sweeps 1 → 3 while active.
    this.run.combo = status === 'active' ? 1 + 2 * (0.5 + 0.5 * Math.sin(this.elapsed * 1.5)) : 1;

    // Simulate ~6 slaps/sec while active so splats/wobble get exercised under ?mockrender.
    if (status === 'active') {
      this.clickAccum += dt * 6;
      while (this.clickAccum >= 1) {
        this.run.clicks++;
        this.clickAccum -= 1;
      }
    }

    if (t < dt) this.hv = 0; // clean reset at loop wrap so height visibly re-ramps
  }

  /** Begin self-driving on rAF (browser only). */
  start(): void {
    this.last = performance.now();
    const loop = (now: number) => {
      this.update(Math.min(0.1, (now - this.last) / 1000));
      this.last = now;
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop(): void {
    cancelAnimationFrame(this.raf);
  }
}

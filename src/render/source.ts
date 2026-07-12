/**
 * source.ts - the narrow, read-only view the renderer needs of the game (PLAN §10).
 *
 * Duck-typed so the real `Store` satisfies it structurally (it has extra fields) AND a mock
 * fixture can implement it for isolated visual testing. The renderer depends only on this - never
 * on the concrete store or the sim internals - and never mutates it.
 */

import type { ZoneDef } from '../config/zones';
import type { RunStatus } from '../sim/game';
import type { Screen } from '../store';

export type { RunStatus, Screen };

/** The run-state slice the renderer reads (a structural subset of sim `RunState`). */
export interface RenderRun {
  status: RunStatus;
  combo: number;
  collapseTimer: number;
  peakHeightRaw: number;
  /** Lifetime click count this run - the renderer watches it rise to fire splat/wobble impacts. */
  clicks: number;
  /** Owned producer counts - each producer gets its own ambient visual signature (producerFx). */
  producersOwned: Readonly<Record<string, number>>;
}

/** A tap's screen position (CSS pixels), recorded by the UI so splats land where you tapped. */
export interface ClickPoint {
  x: number;
  y: number;
}

/** The game accessors the renderer reads (a structural subset of sim `Game`). */
export interface RenderGame {
  heightRaw(): number;
  currentZone(): ZoneDef;
  /** Seconds of structural buffer left; `Infinity` when not melting - guard for it. */
  bufferSeconds(): number;
  run: RenderRun;
}

export interface RenderSource {
  screen: Screen;
  game: RenderGame;
  /** View zoom multiplier (1 = framed on the tower; higher pulls back to show the environment). */
  viewZoom: number;
  subscribe(fn: () => void): () => void;
  /** Return-and-clear the screen positions of taps since the last frame (presentation state only -
   *  the renderer "reads" them destructively by design; they never touch the sim). */
  drainClickPoints(): ClickPoint[];
}

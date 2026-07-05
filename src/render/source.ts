/**
 * source.ts — the narrow, read-only view the renderer needs of the game (PLAN §10).
 *
 * Duck-typed so the real `Store` satisfies it structurally (it has extra fields) AND a mock
 * fixture can implement it for isolated visual testing. The renderer depends only on this — never
 * on the concrete store or the sim internals — and never mutates it.
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
  /** Lifetime click count this run — the renderer watches it rise to fire splat/wobble impacts. */
  clicks: number;
}

/** The game accessors the renderer reads (a structural subset of sim `Game`). */
export interface RenderGame {
  heightRaw(): number;
  currentZone(): ZoneDef;
  /** Seconds of structural buffer left; `Infinity` when not melting — guard for it. */
  bufferSeconds(): number;
  run: RenderRun;
}

export interface RenderSource {
  screen: Screen;
  game: RenderGame;
  subscribe(fn: () => void): () => void;
}

/**
 * store.ts — tiny custom pub/sub bridging the pure sim to the DOM UI (PLAN §9 state layer).
 * The UI reads sim state THROUGH this store and calls its actions; it never mutates the sim
 * directly (PLAN §10). The store owns the fixed-timestep loop and screen/prestige flow.
 */

import { balance } from './config/balance';
import { Game, createMetaState, type MetaState } from './sim/game';
import { bankRun, geEarned, buyMeta } from './sim/prestige';

export type Screen = 'menu' | 'run' | 'paused' | 'win' | 'puddle';

export interface Settings {
  sillyNames: boolean;
  muted: boolean;
}

export function defaultSettings(): Settings {
  return { sillyNames: false, muted: true };
}

type Listener = () => void;

export class Store {
  game: Game;
  meta: MetaState;
  settings: Settings;
  screen: Screen = 'menu';
  /** GE earned from the run that just ended (for the win/puddle screens). */
  lastGe = 0;

  private listeners = new Set<Listener>();
  private accumulator = 0;
  private lastFrame = 0;
  private rafId = 0;
  private running = false;
  private prevStatus = '';

  constructor(meta?: MetaState, settings?: Settings) {
    this.meta = meta ?? createMetaState();
    this.settings = settings ?? defaultSettings();
    this.game = new Game(this.meta, 1);
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  emit(): void {
    for (const l of this.listeners) l();
  }

  // ---- Loop (fixed 10 Hz logic, rAF-driven; PLAN §13) ----

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastFrame = performance.now();
    const frame = (now: number) => {
      if (!this.running) return;
      const dt = Math.min(0.25, (now - this.lastFrame) / 1000); // clamp tab-lag spikes
      this.lastFrame = now;
      this.accumulator += dt;
      const step = 1 / balance.tickHz;
      let ticked = false;
      while (this.accumulator >= step) {
        if (this.screen === 'run') {
          this.game.tick(step);
          ticked = true;
        }
        this.accumulator -= step;
      }
      if (this.screen === 'run') this.handleRunTransitions();
      // Only re-render when a logic tick advanced (~10 Hz). Static screens (menu/win/puddle)
      // render on explicit actions, not every frame — avoids DOM thrash detaching buttons.
      if (ticked) this.emit();
      this.rafId = requestAnimationFrame(frame);
    };
    this.rafId = requestAnimationFrame(frame);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
  }

  private handleRunTransitions(): void {
    const status = this.game.run.status;
    if (status === this.prevStatus) return;
    this.prevStatus = status;
    if (status === 'won') {
      // Preview the win payout; the player banks it explicitly (PLAN §6).
      this.lastGe = geEarned(this.game.run.peakHeightRaw, true, this.meta);
      this.screen = 'win';
    } else if (status === 'dead') {
      this.lastGe = bankRun(this.meta, this.game.run.peakHeightRaw, false);
      this.screen = 'puddle';
    }
  }

  // ---- Actions (UI calls these) ----

  startRun(): void {
    this.game = new Game(this.meta, (this.meta.totalClicks % 100000) + 1);
    this.game.run.status = 'grace';
    this.prevStatus = '';
    this.lastGe = 0;
    this.screen = 'run';
    this.emit();
  }

  click(): void {
    this.game.click();
    this.emit();
  }

  buyProducer(id: string, count = 1): void {
    if (this.game.buyProducer(id, count)) this.emit();
  }

  buyRunUpgrade(id: string): void {
    if (this.game.buyRunUpgrade(id)) this.emit();
  }

  buyTierUpgrade(id: string): void {
    if (this.game.buyTierUpgrade(id)) this.emit();
  }

  /** Purchase a meta upgrade with Goop Essence (persistent progression, PLAN §6). */
  buyMeta(id: string): void {
    if (buyMeta(this.meta, id)) this.emit();
  }

  /** Bank a won run (applies the ×3 win multiplier via geEarned) and return to menu. */
  bankWin(): void {
    bankRun(this.meta, this.game.run.peakHeightRaw, true);
    this.toMenu();
  }

  toMenu(): void {
    this.screen = 'menu';
    this.prevStatus = '';
    this.emit();
  }

  /** Pause an in-progress run (freezes the sim — the loop only ticks on 'run'). */
  pause(): void {
    if (this.screen === 'run') {
      this.screen = 'paused';
      this.emit();
    }
  }

  /** Resume a paused run without disturbing it. */
  resume(): void {
    if (this.screen === 'paused') {
      this.screen = 'run';
      this.lastFrame = performance.now(); // avoid a big dt spike after the pause
      this.emit();
    }
  }

  toggleSilly(): void {
    this.settings.sillyNames = !this.settings.sillyNames;
    this.emit();
  }
}

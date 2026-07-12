/**
 * store.ts - tiny custom pub/sub bridging the pure sim to the DOM UI (PLAN §9 state layer).
 * The UI reads sim state THROUGH this store and calls its actions; it never mutates the sim
 * directly (PLAN §10). The store owns the fixed-timestep loop and screen/prestige flow.
 */

import { balance } from './config/balance';
import { Game, createMetaState, type MetaState } from './sim/game';
import { bankRun, geEarned, buyMeta } from './sim/prestige';
import { checkAchievements } from './sim/achievements';

export type Screen = 'menu' | 'run' | 'paused' | 'win' | 'puddle';

export interface Settings {
  sillyNames: boolean;
  muted: boolean;
  haptics: boolean;
}

export function defaultSettings(): Settings {
  return { sillyNames: false, muted: true, haptics: true };
}

type Listener = () => void;

export class Store {
  game: Game;
  meta: MetaState;
  settings: Settings;
  screen: Screen = 'menu';
  /** GE earned from the run that just ended (for the win/puddle screens). */
  lastGe = 0;
  /** Screen positions of recent taps (presentation only; drained by the renderer each frame). */
  private clickPoints: { x: number; y: number }[] = [];
  /** View zoom multiplier (presentation only): 1 = framed on the tower, higher = pulled back to
   *  see the environment/scale markers. Cycled by the HUD telescope button. */
  viewZoom = 1;

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
      // render on explicit actions, not every frame - avoids DOM thrash detaching buttons.
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
      checkAchievements(this.game); // puddle/GE-count achievements land with the payout
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

  click(x?: number, y?: number): void {
    this.game.click();
    if (x !== undefined && y !== undefined) {
      this.clickPoints.push({ x, y });
      if (this.clickPoints.length > 16) this.clickPoints.shift();
    }
    this.emit();
  }

  /** Tap a chaos-event target (goober/meteor/inspector). Also counts as a splat point. */
  tapEventTarget(x?: number, y?: number): boolean {
    const ok = this.game.tapEventTarget();
    if (ok) {
      if (x !== undefined && y !== undefined) {
        this.clickPoints.push({ x, y });
        if (this.clickPoints.length > 16) this.clickPoints.shift();
      }
      this.emit();
    }
    return ok;
  }

  /** Answer the active decision event (The Investor). */
  answerEvent(accept: boolean): boolean {
    const ok = this.game.answerEvent(accept);
    if (ok) this.emit();
    return ok;
  }

  /** Win-screen action: keep the tower, descend into the Goopiverse (Endless, PLAN §3). */
  enterEndless(): boolean {
    const ok = this.game.enterEndless();
    if (ok) {
      this.screen = 'run';
      this.emit();
    }
    return ok;
  }

  /** Drain queued event-outcome toast lines (UI shows them like achievement toasts). */
  drainEventToasts(): string[] {
    if (this.game.eventToasts.length === 0) return [];
    return this.game.eventToasts.splice(0);
  }

  /** Renderer contract (RenderSource): return-and-clear tap positions since the last frame. */
  drainClickPoints(): { x: number; y: number }[] {
    if (this.clickPoints.length === 0) return this.clickPoints;
    const out = this.clickPoints;
    this.clickPoints = [];
    return out;
  }

  buyProducer(id: string, count = 1): boolean {
    const ok = this.game.buyProducer(id, count);
    if (ok) this.emit();
    return ok;
  }

  buyRunUpgrade(id: string): boolean {
    const ok = this.game.buyRunUpgrade(id);
    if (ok) this.emit();
    return ok;
  }

  buyTierUpgrade(id: string): boolean {
    const ok = this.game.buyTierUpgrade(id);
    if (ok) this.emit();
    return ok;
  }

  /** Purchase a meta upgrade with Goop Essence (persistent progression, PLAN §6). */
  buyMeta(id: string): boolean {
    const ok = buyMeta(this.meta, id);
    if (ok) this.emit();
    return ok;
  }

  /** Bank a won run (applies the ×3 win multiplier via geEarned) and return to menu. */
  bankWin(): void {
    bankRun(this.meta, this.game.run.peakHeightRaw, true);
    checkAchievements(this.game); // win-count/GE achievements land with the bank
    this.toMenu();
  }

  toMenu(): void {
    this.screen = 'menu';
    this.prevStatus = '';
    this.emit();
  }

  /** Pause an in-progress run (freezes the sim - the loop only ticks on 'run'). */
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

  toggleMuted(): void {
    this.settings.muted = !this.settings.muted;
    this.emit();
  }

  toggleHaptics(): void {
    this.settings.haptics = !this.settings.haptics;
    this.emit();
  }

  /** Cycle the view zoom: framed → wide → panorama → back. */
  cycleZoom(): void {
    this.viewZoom = this.viewZoom >= 2.6 ? 1 : this.viewZoom >= 1.7 ? 2.6 : 1.7;
    this.emit();
  }
}

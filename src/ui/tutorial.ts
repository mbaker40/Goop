/**
 * tutorial.ts - the Judgmental Toaster overlay (UI layer; content in config/tutorial.ts).
 *
 * A 2D portrait card (canvas-drawn, three expressions) with a typewriter speech bubble sits
 * bottom-left during the tutorial. HUD pieces listed in TUTORIAL_MANAGED stay hidden until a
 * step reveals them; a pulsing ring points at the current step's target. Progress lives in
 * meta.tutorialStep (persisted by the normal autosave). Reads game state through the Store on
 * emits; never mutates sim state (advancing the step is a meta/UI concern).
 */

import type { Store } from '../store';
import { TUTORIAL_STEPS, TUTORIAL_MANAGED, PUDDLE_TIP, type ToasterFace } from '../config/tutorial';

const TYPE_MS = 28;

export class TutorialUI {
  private card: HTMLElement | null = null;
  private bubble: HTMLElement | null = null;
  private pointer: HTMLElement | null = null;
  private lineIdx = 0;
  private typed = 0;
  private typeTimer = 0;
  private goalMet = false;
  private puddleShowing = false;

  constructor(private store: Store) {
    this.store.subscribe(() => this.sync());
    this.sync();
  }

  get active(): boolean {
    return this.store.meta.tutorialStep < TUTORIAL_STEPS.length && this.store.screen === 'run';
  }

  /** Called on every store emit (and by GoopUI after run-screen rebuilds). */
  sync(): void {
    const meta = this.store.meta;

    // The one-time puddle coaching beat (independent of the main tutorial).
    if (this.store.screen === 'puddle' && !meta.puddleTipShown && !this.puddleShowing) {
      this.puddleShowing = true;
      this.showCard(PUDDLE_TIP.face, PUDDLE_TIP.lines, () => {
        meta.puddleTipShown = true;
        this.puddleShowing = false;
        this.teardown();
      });
      return;
    }
    if (this.puddleShowing) return;

    if (!this.active) {
      if (this.store.screen !== 'puddle') this.teardown();
      this.applyHudGate();
      return;
    }

    const step = TUTORIAL_STEPS[meta.tutorialStep]!;
    if (!this.card) {
      this.lineIdx = 0;
      this.goalMet = false;
      this.showCard(step.face, step.lines, null);
    }
    this.applyHudGate();
    this.placePointer(step.pointAt);

    // Goal check: advance once the predicate holds AND the player has read the lines.
    if (!this.goalMet && step.goal(this.store.game)) this.goalMet = true;
    if (this.goalMet && this.lineIdx >= step.lines.length - 1 && this.typedOut(step.lines)) {
      meta.tutorialStep++;
      this.teardown();
      if (meta.tutorialStep >= TUTORIAL_STEPS.length) this.applyHudGate();
      // Next sync() (every emit, 10 Hz) builds the next step's card.
    }
  }

  private typedOut(lines: string[]): boolean {
    return this.typed >= (lines[this.lineIdx] ?? '').length;
  }

  /** Hide managed HUD ids unless a completed-or-current step has revealed them. */
  private applyHudGate(): void {
    const stepIdx = this.store.meta.tutorialStep;
    const done = stepIdx >= TUTORIAL_STEPS.length;
    const revealed = new Set<string>();
    if (!done) {
      for (let i = 0; i <= Math.min(stepIdx, TUTORIAL_STEPS.length - 1); i++) {
        for (const id of TUTORIAL_STEPS[i]!.reveal) revealed.add(id);
      }
    }
    for (const id of TUTORIAL_MANAGED) {
      const el = document.getElementById(id);
      if (!el) continue;
      const hide = !done && !revealed.has(id);
      if ((el.style.visibility === 'hidden') !== hide) el.style.visibility = hide ? 'hidden' : '';
    }
  }

  private showCard(face: ToasterFace, lines: string[], onDone: (() => void) | null): void {
    this.teardown();
    const card = document.createElement('div');
    card.id = 'tut-card';
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 128;
    canvas.className = 'tut-portrait';
    drawToaster(canvas, face);
    const bubble = document.createElement('div');
    bubble.className = 'tut-bubble';
    const skip = document.createElement('button');
    skip.className = 'tut-skip mini';
    skip.textContent = onDone ? 'Thanks, I guess' : 'Skip tutorial';
    skip.addEventListener('click', () => {
      if (onDone) onDone();
      else {
        this.store.meta.tutorialStep = TUTORIAL_STEPS.length;
        this.teardown();
        this.applyHudGate();
      }
      this.store.emit();
    });
    card.appendChild(canvas);
    card.appendChild(bubble);
    card.appendChild(skip);
    document.body.appendChild(card);
    this.card = card;
    this.bubble = bubble;
    this.lineIdx = 0;
    this.startTyping(lines, face, onDone);
    // Tapping the bubble: finish the line instantly, or advance to the next line.
    bubble.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      const line = lines[this.lineIdx] ?? '';
      if (this.typed < line.length) {
        this.typed = line.length;
        bubble.textContent = line;
      } else if (this.lineIdx < lines.length - 1) {
        this.lineIdx++;
        this.startTyping(lines, face, onDone);
      } else if (onDone) {
        onDone();
        this.store.emit();
      }
    });
  }

  private startTyping(lines: string[], _face: ToasterFace, _onDone: (() => void) | null): void {
    const line = lines[this.lineIdx] ?? '';
    this.typed = 0;
    window.clearInterval(this.typeTimer);
    this.typeTimer = window.setInterval(() => {
      this.typed++;
      if (this.bubble) this.bubble.textContent = line.slice(0, this.typed) + (this.typed < line.length ? '▏' : '');
      if (this.typed >= line.length) window.clearInterval(this.typeTimer);
    }, TYPE_MS);
    if (this.bubble) this.bubble.textContent = '';
  }

  private placePointer(targetId?: string): void {
    if (!targetId) {
      this.pointer?.remove();
      this.pointer = null;
      return;
    }
    const target = document.getElementById(targetId);
    if (!target) return;
    if (!this.pointer) {
      this.pointer = document.createElement('div');
      this.pointer.id = 'tut-pointer';
      document.body.appendChild(this.pointer);
    }
    const r = target.getBoundingClientRect();
    // The stage is the whole screen - ring the goop area (center-ish) instead of the full rect.
    const stage = targetId === 'stage';
    const cx = r.left + r.width / 2;
    const cy = stage ? r.top + r.height * 0.62 : r.top + r.height / 2;
    const rad = stage ? 90 : Math.max(r.width, r.height) / 2 + 14;
    this.pointer.style.left = `${cx - rad}px`;
    this.pointer.style.top = `${cy - rad}px`;
    this.pointer.style.width = this.pointer.style.height = `${rad * 2}px`;
  }

  private teardown(): void {
    window.clearInterval(this.typeTimer);
    this.card?.remove();
    this.card = null;
    this.bubble = null;
    this.pointer?.remove();
    this.pointer = null;
  }
}

/** The toaster portrait, drawn plain-canvas (no three.js in the UI layer). */
function drawToaster(canvas: HTMLCanvasElement, face: ToasterFace): void {
  const c = canvas.getContext('2d')!;
  c.clearRect(0, 0, 128, 128);
  const rr = (x: number, y: number, w: number, h: number, r: number, fill: string) => {
    c.fillStyle = fill;
    c.beginPath();
    c.roundRect(x, y, w, h, r);
    c.fill();
  };
  // Body + base + slots + lever.
  rr(14, 38, 100, 64, 18, '#c7ccd6');
  rr(14, 72, 100, 30, 12, '#aab1bf');
  rr(28, 30, 30, 14, 5, '#2a2436');
  rr(70, 30, 30, 14, 5, '#2a2436');
  rr(108, 52, 8, 20, 4, '#2a2436');
  // Eyes.
  c.fillStyle = '#2a2436';
  const eyeY = face === 'alarm' ? 58 : 60;
  const eyeH = face === 'alarm' ? 8 : 6;
  c.beginPath();
  c.ellipse(48, eyeY, 4.5, eyeH, 0, 0, Math.PI * 2);
  c.ellipse(80, eyeY, 4.5, eyeH, 0, 0, Math.PI * 2);
  c.fill();
  // Brows.
  c.strokeStyle = '#2a2436';
  c.lineWidth = 4;
  c.beginPath();
  if (face === 'judge') {
    c.moveTo(38, 50);
    c.lineTo(56, 54);
    c.moveTo(90, 50);
    c.lineTo(72, 54);
  } else if (face === 'alarm') {
    c.moveTo(38, 46);
    c.lineTo(56, 44);
    c.moveTo(90, 46);
    c.lineTo(72, 44);
  } else {
    c.moveTo(38, 52);
    c.lineTo(56, 50);
    c.moveTo(90, 48);
    c.lineTo(72, 52); // one brow raised: reluctant respect
  }
  c.stroke();
  // Mouth.
  c.beginPath();
  if (face === 'judge') {
    c.moveTo(52, 84);
    c.lineTo(76, 84);
  } else if (face === 'alarm') {
    c.ellipse(64, 86, 7, 9, 0, 0, Math.PI * 2);
  } else {
    c.arc(64, 82, 10, 0.15 * Math.PI, 0.85 * Math.PI);
  }
  c.stroke();
}

/** Transient toaster cameo (boss beats, win screen): same card look, no gating, self-removes. */
export function showToasterCameo(lines: string[], face: ToasterFace, ms = 4500): void {
  document.getElementById('tut-cameo')?.remove();
  const card = document.createElement('div');
  card.id = 'tut-cameo';
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  canvas.className = 'tut-portrait';
  drawToaster(canvas, face);
  const bubble = document.createElement('div');
  bubble.className = 'tut-bubble';
  bubble.innerHTML = lines.map((l) => escapeHtml(l)).join('<br>');
  card.appendChild(canvas);
  card.appendChild(bubble);
  document.body.appendChild(card);
  window.setTimeout(() => card.remove(), ms);
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

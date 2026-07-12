/**
 * audio/index.ts - first audio pass (PLAN §11): synthesized squelches, no asset files.
 *
 * Everything is generated with WebAudio (a pitch-dropping sine "blup" + a bandpassed noise burst),
 * with random pitch/volume jitter so mashing never sounds like a machine gun. Rate limiting per
 * §11: beyond 8 squelches/sec, clicks coalesce - every 4th spam-click plays one fatter
 * "mega-squelch" instead (rewards spam, saves ears). The AudioContext is created lazily on the
 * first un-muted user gesture (browser autoplay policy - CLAUDE.md footgun).
 *
 * iOS Safari lifecycle footguns (this file defends against all of them):
 *  1. User-activation timing: iOS only counts `pointerup`/`touchend`/`click`/`keydown` as a
 *     "real" user activation for creating/resuming an AudioContext - `pointerdown`/`touchstart`
 *     (what ui/app.ts fires squelches from) are NOT reliable activations. A context created there
 *     can be born (or stay) 'suspended' and never make sound. So this module also listens on
 *     `window` (capture phase) for the activation-safe event types and opportunistically
 *     creates/resumes the context from those, independent of any playback call.
 *  2. Backgrounding: iOS suspends (or reports 'interrupted' on) the AudioContext when the tab is
 *     backgrounded and does not reliably auto-resume it on return. A `visibilitychange` handler
 *     retries `resume()` when the page becomes visible again.
 *  3. Restored-run boot: a reload can land straight on the run screen (persisted save) with no
 *     button press before the first tower tap. The window-level unlock listeners above cover this
 *     the same as any other first gesture - they don't require a specific element/button.
 *  4. Never wedge: none of the unlock listeners are "fire once and forget" - they're ordinary
 *     listeners left attached for the life of the page, and every one is a no-op once the context
 *     is already 'running'. So if a resume() attempt fails or its promise rejects, the very next
 *     qualifying gesture (or the next visibilitychange) just tries again.
 */

let ctx: AudioContext | null = null;
let muted = true;
let master: GainNode | null = null;
let noiseBuf: AudioBuffer | null = null;

// Rate limiting state (PLAN §11).
let recent: number[] = [];
let coalesced = 0;

export function setMuted(m: boolean): void {
  muted = m;
  // If sound was just turned on inside a real user gesture (e.g. the settings toggle's click
  // handler), try to unlock immediately rather than waiting for the *next* gesture.
  if (!muted) tryUnlock();
}

function createContext(): AudioContext | null {
  const AC: typeof AudioContext | undefined =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  const c = new AC();
  master = c.createGain();
  master.gain.value = 0.5;
  master.connect(c.destination);
  // 0.3s of white noise, reused by every squelch.
  noiseBuf = c.createBuffer(1, Math.floor(c.sampleRate * 0.3), c.sampleRate);
  const data = noiseBuf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return c;
}

/** Create the context if needed and (re)try resuming it. Safe to call speculatively - it's a
 * no-op once muted or once the context is already 'running'. Never throws: a rejected resume()
 * just leaves the context suspended for the next attempt to retry. */
function tryUnlock(): void {
  if (muted) return;
  if (!ctx) ctx = createContext();
  if (ctx && ctx.state !== 'running') {
    ctx.resume().catch(() => {
      /* still stuck (e.g. no real activation yet) - listeners below stay armed to retry */
    });
  }
}

if (typeof window !== 'undefined') {
  // Capture phase, on window, so this fires regardless of which element ends up handling the
  // event (or if something downstream calls stopPropagation). These are the event types iOS
  // Safari actually honors as user activations for WebAudio - NOT pointerdown/touchstart.
  for (const type of ['pointerup', 'touchend', 'click', 'keydown'] as const) {
    window.addEventListener(type, tryUnlock, { capture: true, passive: true });
  }
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') tryUnlock();
    });
  }
}

function ensure(): AudioContext | null {
  if (muted) return null;
  if (!ctx) ctx = createContext();
  if (!ctx) return null;
  if (ctx.state !== 'running') void ctx.resume();
  return ctx;
}

declare global {
  interface Window {
    __goopAudio?: { state: () => AudioContextState | 'none'; muted: () => boolean };
  }
}

// Minimal debug hook for smoke tests, only under ?debug (mirrors window.__goopStore in main.ts).
if (typeof window !== 'undefined' && typeof location !== 'undefined' && location.search.includes('debug')) {
  window.__goopAudio = {
    state: () => ctx?.state ?? 'none',
    muted: () => muted,
  };
}

/** One WET goop slap. Three layers make it read as goo, not a beep:
 *  1. "Smack" - a 15ms high noise tick (hand meets goop).
 *  2. "Squish" - the body: noise squeezed through a RESONANT lowpass whose cutoff dives
 *     2.2kHz→150Hz (the classic wet-squelch gesture; the resonance is what sounds slimy).
 *  3. "Blub" - a low sine that burps down 150→45Hz with a wobble, the goop mass settling.
 *  `heat` 0..1 (combo) raises pitch/brightness; `fat` scales everything (mega-squelch). */
function squelchVoice(c: AudioContext, heat: number, fat: number): void {
  const t = c.currentTime;
  const jitter = 0.8 + Math.random() * 0.4; // ±20% pitch variance (PLAN §11)

  // 1. Smack: tiny high tick for the contact transient.
  const smack = c.createBufferSource();
  smack.buffer = noiseBuf;
  const hp = c.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 1800;
  const sg = c.createGain();
  sg.gain.setValueAtTime(0.07 * fat, t);
  sg.gain.exponentialRampToValueAtTime(0.001, t + 0.02);
  smack.connect(hp).connect(sg).connect(master!);
  smack.start(t);
  smack.stop(t + 0.03);

  // 2. Squish: resonant lowpass dive over noise - the wet core of the sound.
  const noise = c.createBufferSource();
  noise.buffer = noiseBuf;
  noise.playbackRate.value = 0.7 + Math.random() * 0.5;
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.Q.value = 9 + Math.random() * 4; // high resonance = slimy formant
  const fTop = (1600 + heat * 900) * jitter;
  lp.frequency.setValueAtTime(fTop, t);
  lp.frequency.exponentialRampToValueAtTime(140, t + 0.11 * fat);
  const ng = c.createGain();
  ng.gain.setValueAtTime(0.0001, t);
  ng.gain.exponentialRampToValueAtTime(0.3 * fat, t + 0.012);
  ng.gain.exponentialRampToValueAtTime(0.001, t + 0.16 * fat);
  noise.connect(lp).connect(ng).connect(master!);
  noise.start(t);
  noise.stop(t + 0.2 * fat);

  // 3. Blub: low sine burp with a wobble on the way down.
  const osc = c.createOscillator();
  const og = c.createGain();
  osc.type = 'sine';
  const f0 = (130 + heat * 70) * jitter;
  osc.frequency.setValueAtTime(f0, t);
  osc.frequency.exponentialRampToValueAtTime(f0 * 0.55, t + 0.045 * fat);
  osc.frequency.exponentialRampToValueAtTime(f0 * 0.7, t + 0.075 * fat); // the wobble
  osc.frequency.exponentialRampToValueAtTime(Math.max(38, f0 * 0.3), t + 0.16 * fat);
  og.gain.setValueAtTime(0.0001, t);
  og.gain.exponentialRampToValueAtTime(0.22 * fat * (0.85 + Math.random() * 0.3), t + 0.01);
  og.gain.exponentialRampToValueAtTime(0.001, t + 0.18 * fat);
  osc.connect(og).connect(master!);
  osc.start(t);
  osc.stop(t + 0.2 * fat);
}

/** Slap squelch, rate-limited per PLAN §11. `heat` = combo progress 0..1. */
export function squelch(heat = 0): void {
  const c = ensure();
  if (!c) return;
  const now = performance.now();
  recent = recent.filter((x) => now - x < 1000);
  if (recent.length >= 8) {
    // Coalesce: every 4th over-rate click still lands one fatter mega-squelch.
    coalesced++;
    if (coalesced % 4 !== 0) return;
    recent.push(now);
    squelchVoice(c, heat, 1.8);
    return;
  }
  recent.push(now);
  squelchVoice(c, heat, 1);
}

/** Cheerful two-blip on any purchase. */
export function purchaseBlip(): void {
  const c = ensure();
  if (!c) return;
  const t = c.currentTime;
  for (let i = 0; i < 2; i++) {
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440 * Math.pow(2, (i * 5) / 12), t + i * 0.07);
    g.gain.setValueAtTime(0.0001, t + i * 0.07);
    g.gain.exponentialRampToValueAtTime(0.12, t + i * 0.07 + 0.015);
    g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.07 + 0.12);
    osc.connect(g).connect(master!);
    osc.start(t + i * 0.07);
    osc.stop(t + i * 0.07 + 0.14);
  }
}

/** Rising three-note sting for a zone transition (the run's biggest musical moment for now). */
export function zoneSting(): void {
  const c = ensure();
  if (!c) return;
  const t = c.currentTime;
  const notes = [0, 4, 9]; // major-ish rise
  notes.forEach((semi, i) => {
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(330 * Math.pow(2, semi / 12), t + i * 0.11);
    g.gain.setValueAtTime(0.0001, t + i * 0.11);
    g.gain.exponentialRampToValueAtTime(0.14, t + i * 0.11 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.11 + 0.35);
    osc.connect(g).connect(master!);
    osc.start(t + i * 0.11);
    osc.stop(t + i * 0.11 + 0.4);
  });
}

/** Low descending groan when the tower starts collapsing. */
export function collapseGroan(): void {
  const c = ensure();
  if (!c) return;
  const t = c.currentTime;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(140, t);
  osc.frequency.exponentialRampToValueAtTime(38, t + 1.6);
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 420;
  g.gain.setValueAtTime(0.12, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 1.8);
  osc.connect(lp).connect(g).connect(master!);
  osc.start(t);
  osc.stop(t + 1.9);
}

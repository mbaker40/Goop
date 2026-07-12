/**
 * audio/index.ts — first audio pass (PLAN §11): synthesized squelches, no asset files.
 *
 * Everything is generated with WebAudio (a pitch-dropping sine "blup" + a bandpassed noise burst),
 * with random pitch/volume jitter so mashing never sounds like a machine gun. Rate limiting per
 * §11: beyond 8 squelches/sec, clicks coalesce — every 4th spam-click plays one fatter
 * "mega-squelch" instead (rewards spam, saves ears). The AudioContext is created lazily on the
 * first un-muted user gesture (browser autoplay policy — CLAUDE.md footgun).
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
}

function ensure(): AudioContext | null {
  if (muted) return null;
  if (!ctx) {
    const AC: typeof AudioContext | undefined =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
    // 0.3s of white noise, reused by every squelch.
    noiseBuf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.3), ctx.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

/** One WET goop slap. Three layers make it read as goo, not a beep:
 *  1. "Smack" — a 15ms high noise tick (hand meets goop).
 *  2. "Squish" — the body: noise squeezed through a RESONANT lowpass whose cutoff dives
 *     2.2kHz→150Hz (the classic wet-squelch gesture; the resonance is what sounds slimy).
 *  3. "Blub" — a low sine that burps down 150→45Hz with a wobble, the goop mass settling.
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

  // 2. Squish: resonant lowpass dive over noise — the wet core of the sound.
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

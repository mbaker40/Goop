import './style.css';
import { P, cut, inked, flat, box, line, label, ctx, S, setContext, setScale, reduce, W, H, INK, EDGE, PAPER, FONT, clamp, lerp, easeOut, rng } from './draw.js';
import { FOOD } from './sprites/food.js';
import { drawGoop, goopColours } from './sprites/goop.js';
import { SCENES } from './scenes/index.js';
import { STAGES, END, FEEDERS, UPGRADES, FRENZY_MULT, FRENZY_SECS, GEYSER_SECS, ASCEND_BONUS, newState, feederCost, feederRate, slopPerSec, feedValue, stageOf, stageProgress, massGrams, earn, feederOpen, upgradeOpen } from './econ.js';
import { fmt, fmtMass, heavierThan, clock } from './fmt.js';

const $ = id => document.getElementById(id);
const cv = $('scene');
setContext(cv.getContext('2d'));

/* ---------- state, saving ---------- */
let state = newState();
const prefs = { sound: true };
const KEY = 'feed-the-goop-v1';
function save() { try { localStorage.setItem(KEY, JSON.stringify({ state, prefs, at: Date.now() })); } catch (e) { /* private window: the game still plays, it just forgets */ } }
function adopt(d) {
  if (!d || !d.state) return 0;
  const s = newState(), o = d.state;
  for (const k of ['slop', 'life', 'feeds', 'asc', 'played']) if (Number.isFinite(o[k]) && o[k] >= 0) s[k] = o[k];
  if (Array.isArray(o.own)) s.own = s.own.map((_, i) => Math.max(0, Math.floor(+o.own[i] || 0)));
  if (o.ups && typeof o.ups === 'object') for (const u of UPGRADES) if (o.ups[u.id]) s.ups[u.id] = true;
  s.winSeen = !!o.winSeen; s.stage = stageOf(s.life); s.won = s.life >= END.at;
  state = s;
  if (d.prefs && typeof d.prefs.sound === 'boolean') prefs.sound = d.prefs.sound;
  return Number.isFinite(d.at) ? Math.max(0, (Date.now() - d.at) / 1000) : 0;       // seconds spent away
}

/* ---------- what's moving on stage ---------- */
const anim = { squash: 0, squashV: 0, mouth: 0, fling: 1, zoom: 1, r: 30, cy: 0, won: false, lookX: W / 2, lookY: H / 2 };
const par = { x: 0, y: 0, tx: 0, ty: 0 };
const shots = [], drops = [], floats = [];
let vial = null, vialIn = 38, peek = null, autoAcc = 0, toastT = 0, bannerT = 0, resetArm = 0;

/* ---------- sound: tiny synth blips, nothing to load ---------- */
let ac = null;
function blip(f, dur, type, vol, slide, delay) {
  if (!prefs.sound) return;
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    const t0 = ac.currentTime + (delay || 0), o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t0); o.frequency.exponentialRampToValueAtTime(Math.max(30, f * slide), t0 + dur);
    g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(.0001, t0 + dur);
    o.connect(g); g.connect(ac.destination); o.start(t0); o.stop(t0 + dur + .02);
  } catch (e) { /* no audio here: play silently */ }
}
const sfx = {
  feed: () => blip(190 + Math.random() * 70, .13, 'sine', .07, .42),
  buy: () => { blip(520, .08, 'triangle', .05, 1.5); blip(780, .1, 'triangle', .05, 1.2, .07); },
  vial: () => [0, 1, 2, 3].forEach(i => blip(440 * Math.pow(1.26, i), .14, 'square', .03, 1.02, i * .07)),
  stage: () => [0, 1, 2, 3, 4].forEach(i => blip(262 * Math.pow(1.335, i), .2, 'triangle', .06, 1, i * .1)),
};

/* ---------- playing ---------- */
function gain(n) {
  if (earn(state, n)) onStage();
  if (state.won && !state.winSeen) showWin();
}
function mouthPoint() { const g = SCENES[view().k].goop; return [g.x + anim.r * .05, anim.cy + anim.r * .3]; }
function view() { return peek == null ? { k: state.stage, p: clamp(stageProgress(state.life), 0, 1) } : { k: peek, p: .72 }; }
function launch(auto) {
  if (shots.length > 36) return;
  const { k } = view(), sc = SCENES[k], m = mouthPoint();
  const from = auto ? [Math.random() < .5 ? -30 : W + 30, 60 + Math.random() * 300] : sc.hand;
  shots.push({ x0: from[0], y0: from[1], x1: m[0], y1: m[1], u: 0, dur: auto ? .7 : .42, k, kind: Math.random() < .5 ? 0 : 1, rot: Math.random() * 6, spin: (Math.random() - .5) * 9, sc: auto ? .75 : 1.05, auto });
}
function splash(n) {
  const g = SCENES[view().k].goop;
  for (let i = 0; i < n && drops.length < 70; i++) { const a = -Math.PI / 2 + (Math.random() - .5) * 2.2; drops.push({ x: g.x + Math.cos(a) * anim.r * .8, y: anim.cy + Math.sin(a) * anim.r * .8, vx: Math.cos(a) * (90 + Math.random() * 160), vy: Math.sin(a) * (150 + Math.random() * 190), life: .9, r: 4 + Math.random() * 5 }); }
}
function feed(x, y) {
  const v = feedValue(state);
  state.feeds++;
  floats.push({ x, y, txt: '+' + fmt(v), life: 1 }); if (floats.length > 24) floats.shift();
  anim.squashV += 7; anim.fling = 0; anim.mouth = 1;
  launch(false); splash(2); sfx.feed();
  gain(v);
}
function collectVial() {
  const frenzy = Math.random() < .5 && slopPerSec(state) > 0;
  if (frenzy) { state.frenzy = FRENZY_SECS; toast('Mutagen! Feeders work ' + FRENZY_MULT + ' times faster for ' + FRENZY_SECS + ' seconds.'); }
  else { const n = Math.max(25, slopPerSec(state) / (state.frenzy > 0 ? FRENZY_MULT : 1) * GEYSER_SECS); toast('Slop geyser! +' + fmt(n) + ' slop.'); splash(16); gain(n); }
  vial = null; vialIn = 42 + Math.random() * 30; sfx.vial(); anim.squashV += 9;
}
function onStage() {
  anim.zoom = reduce ? 1 : 1.6; shots.length = 0;
  $('bannerSmall').textContent = 'Stage ' + (state.stage + 1) + ' of ' + STAGES.length;
  $('bannerBig').textContent = STAGES[state.stage].name;
  const b = $('banner'); b.hidden = true; void b.offsetWidth; b.hidden = false; bannerT = 2.8;
  sfx.stage(); buildFeeders(); refresh();
}
function showWin() {
  state.winSeen = true;
  $('winText').textContent = 'It took ' + clock(state.played) + ' and ' + state.feeds.toLocaleString('en-US') + ' spoonfuls by hand. The goop now weighs ' + fmtMass(massGrams(state.life)) + '.';
  $('win').hidden = false; save();
}
function hop() {
  const asc = state.asc + 1; state = newState(); state.asc = asc;
  $('win').hidden = true; vial = null; vialIn = 38; shots.length = drops.length = floats.length = 0;
  buildFeeders(); refresh(); save();
  toast('A fresh star system. Everything now earns ' + Math.round(asc * ASCEND_BONUS * 100) + '% more.');
}
function toast(msg) { const t = $('toast'); t.textContent = msg; t.hidden = false; toastT = 4.2; }

/* ---------- the shop ---------- */
let upSig = '', feedSig = '';
function buildFeeders() {
  const F = $('feeders'), keep = document.activeElement && document.activeElement.id;
  F.textContent = ''; let teased = false;
  FEEDERS.forEach((f, i) => {
    if (feederOpen(state, i)) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'item feeder'; b.dataset.f = i; b.id = 'feeder-' + f.id;
      b.innerHTML = '<span class="nm"></span><span class="cost"><i class="drop"></i><span class="c"></span></span><span class="own"></span><span class="fx"></span>';
      b.querySelector('.nm').textContent = f.name; b.title = f.blurb; F.appendChild(b);
    } else if (!teased) {
      teased = true; const d = document.createElement('div'); d.className = 'item locked';
      d.innerHTML = '<span class="nm">???</span><br><span class="fx"></span>'; d.querySelector('.fx').textContent = 'Arrives when the goop ' + STAGES[f.stage - 1].goal + '.'; F.appendChild(d);
    }
  });
  feedSig = FEEDERS.map((f, i) => feederOpen(state, i) ? 1 : 0).join('');
  if (keep && $(keep)) $(keep).focus();
  buildUps();
}
function buildUps() {
  const U = $('ups'), open = UPGRADES.filter(u => upgradeOpen(state, u)).sort((a, b) => a.cost - b.cost);
  U.textContent = '';
  open.slice(0, 4).forEach(u => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'item up'; b.dataset.u = u.id; b.id = 'up-' + u.id;
    b.innerHTML = '<span class="nm"></span><span class="cost"><i class="drop"></i><span class="c"></span></span><span class="fx"></span>';
    b.querySelector('.nm').textContent = u.name; b.querySelector('.c').textContent = fmt(u.cost); b.querySelector('.fx').textContent = u.text; U.appendChild(b);
  });
  const n = document.createElement('p'); n.className = 'note';
  n.textContent = !open.length ? 'The shelf is bare. New upgrades turn up as the goop grows and your feeders multiply.' : open.length > 4 ? (open.length - 4) + ' more waiting behind these.' : '';
  if (n.textContent) U.appendChild(n);
  upSig = open.map(u => u.id).join(',');
}
function buy(el) {
  if (el.dataset.f != null) {
    const i = +el.dataset.f, c = feederCost(state, i);
    if (state.slop < c) return; state.slop -= c; state.own[i]++;
  } else {
    const u = UPGRADES.find(q => q.id === el.dataset.u);
    if (!u || state.slop < u.cost || state.ups[u.id]) return; state.slop -= u.cost; state.ups[u.id] = true;
  }
  sfx.buy(); anim.squashV += 3; refresh();
}
function refresh() {
  if (FEEDERS.map((f, i) => feederOpen(state, i) ? 1 : 0).join('') !== feedSig) buildFeeders();
  else if (UPGRADES.filter(u => upgradeOpen(state, u)).sort((a, b) => a.cost - b.cost).map(u => u.id).join(',') !== upSig) buildUps();
  const sps = slopPerSec(state), g = massGrams(state.life), k = state.stage, p = clamp(stageProgress(state.life), 0, 1);
  $('slop').textContent = fmt(Math.floor(state.slop));
  $('sps').textContent = fmt(sps) + ' per second';
  $('mass').textContent = fmtMass(g);
  $('heavier').textContent = heavierThan(g);
  $('stageName').textContent = 'Stage ' + (k + 1) + ' of ' + STAGES.length + ': ' + STAGES[k].name;
  $('stageNext').textContent = state.won ? 'Nothing left in this system. It is still chewing.' : 'Next: ' + STAGES[k].goal + STAGES[k].when;
  $('bar').style.width = (state.won ? 100 : p * 100).toFixed(1) + '%'; $('bar').style.background = goopColours(k, p)[0];
  $('barBox').setAttribute('aria-valuenow', Math.round(state.won ? 100 : p * 100));
  $('buff').hidden = !(state.frenzy > 0); if (state.frenzy > 0) $('buff').textContent = 'Frenzy x' + FRENZY_MULT + ' for ' + Math.ceil(state.frenzy) + 's';
  $('hint').hidden = state.feeds >= 3 || !$('toast').hidden;
  $('hopSmall').hidden = !(state.won && $('win').hidden);
  document.querySelectorAll('#feeders button').forEach(b => {
    const i = +b.dataset.f, c = feederCost(state, i);
    b.querySelector('.c').textContent = fmt(c); b.querySelector('.own').textContent = state.own[i];
    b.querySelector('.fx').textContent = '+' + fmt(feederRate(state, i)) + ' slop a second each'; b.disabled = state.slop < c;
  });
  document.querySelectorAll('#ups button').forEach(b => { const u = UPGRADES.find(q => q.id === b.dataset.u); b.disabled = state.slop < u.cost; });
}

/* ---------- drawing a frame ---------- */
const grain = (() => { const c = document.createElement('canvas'); c.width = c.height = 160; const x = c.getContext('2d'), im = x.createImageData(160, 160), r = rng(5); for (let i = 0; i < im.data.length; i += 4) { const v = 196 + Math.floor(r() * 60); im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; } x.putImageData(im, 0, 0); return c; })();
let grainPat = null;
function fit() { const w = cv.clientWidth || 640, dpr = Math.min(window.devicePixelRatio || 1, 2); cv.width = Math.round(w * dpr); cv.height = Math.round(w * dpr * H / W); setScale(cv.width / W); grainPat = null; }
function layer(z, fn) { ctx.save(); ctx.translate(-par.x * z, -par.y * z * .5); fn(); ctx.restore(); }   // nearer layers slide further: that's the depth
function render(t) {
  const { k, p } = view(), sc = SCENES[k], g = sc.goop, a = anim;
  a.r = lerp(a.r, lerp(g.r0, g.r1, Math.pow(p, .85)), .14);
  a.cy = g.grounded ? g.base - a.r * .7 * (1 - a.squash * .12) : g.base;
  a.won = state.won && peek == null;
  ctx.setTransform(S, 0, 0, S, 0, 0); ctx.clearRect(0, 0, W, H); ctx.globalAlpha = 1;
  if (a.zoom > 1.002) { ctx.translate(g.x, a.cy); ctx.scale(a.zoom, a.zoom); ctx.translate(-g.x, -a.cy); }     // camera pulls back after each stage change
  let lx = a.lookX, ly = a.lookY; const s0 = shots.find(s => !s.auto) || shots[0]; if (s0) { lx = lerp(s0.x0, s0.x1, s0.u); ly = lerp(s0.y0, s0.y1, s0.u) - Math.sin(s0.u * Math.PI) * 90; }
  layer(5, () => sc.back(t, p, a));
  layer(11, () => sc.mid(t, p, a));
  layer(16, () => {
    drawGoop(g, a.r, k, p, t, { squash: clamp(a.squash, -1, 1), mouth: a.mouth, lookX: lx, lookY: ly });
    for (const s of shots) {
      const x = lerp(s.x0, s.x1, s.u), y = lerp(s.y0, s.y1, s.u) - Math.sin(s.u * Math.PI) * (s.auto ? 60 : 90), sh = s.sc * (1 - clamp((s.u - .78) / .22, 0, 1) * .7);
      ctx.save(); ctx.translate(x, y); ctx.rotate(reduce ? 0 : s.rot + s.spin * s.u); ctx.scale(sh, sh); FOOD[s.k][s.kind](); ctx.restore();
    }
    for (const d of drops) { ctx.globalAlpha = clamp(d.life * 3, 0, 1); inked(P.circ(d.x, d.y, d.r), '#ffb01f', 2.5); } ctx.globalAlpha = 1;
  });
  layer(26, () => sc.front(t, p, a));
  if (vial) layer(20, () => {
    const v = vial, sw = reduce ? 0 : Math.sin(t * 2 + v.seed) * 16, x = v.x + sw, y = lerp(-70, v.y, easeOut(clamp(v.age / .6, 0, 1)));
    v.px = x - par.x * 20; v.py = y - par.y * 10;
    line([[v.x, -30], [x, y - 40]], 'rgba(255,243,214,.75)', 1.8);
    flat(P.circ(x, y, 44 + (reduce ? 0 : 5 * Math.sin(t * 6))), '#fff3b0', .32 + (reduce ? 0 : .16 * Math.sin(t * 6)));
    const F = P.poly([[x - 10, y - 36], [x + 10, y - 36], [x + 10, y - 12], [x + 28, y + 26], [x - 28, y + 26], [x - 10, y - 12]]);
    cut(F, '#e8fbff', { lw: 4, d: 1.4 });
    ctx.save(); ctx.clip(F); box(x - 32, y + 2 + (reduce ? 0 : Math.sin(t * 5) * 2), 64, 30, '#ff5f8f'); flat(P.circ(x - 8, y + 14, 4), '#ffc2d6'); flat(P.circ(x + 9, y + 8, 3), '#ffc2d6'); ctx.restore();
    ctx.lineWidth = 4; ctx.strokeStyle = INK; ctx.stroke(F);
    inked(P.rect(x - 12, y - 46, 24, 12, 3), EDGE, 3);
  });
  layer(16, () => {
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    for (const f of floats) { ctx.globalAlpha = clamp(f.life * 2.2, 0, 1); ctx.font = '400 28px ' + FONT; ctx.lineWidth = 6; ctx.strokeStyle = INK; const y = f.y - (1 - f.life) * 56; ctx.strokeText(f.txt, f.x, y); ctx.fillStyle = PAPER; ctx.fillText(f.txt, f.x, y); }
    ctx.globalAlpha = 1;
  });
  ctx.setTransform(1, 0, 0, 1, 0, 0);                                    // paper grain over everything
  ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = .4;
  ctx.fillStyle = grainPat || (grainPat = ctx.createPattern(grain, 'repeat')); ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
}

/* ---------- one step of time ---------- */
let uiT = 0, saveT = 0;
function step(real, dt) {
  const sps = slopPerSec(state);
  if (sps > 0) gain(sps * real);
  if (state.frenzy > 0) state.frenzy = Math.max(0, state.frenzy - real);
  if (!state.won) state.played += real;
  anim.squashV += (-190 * anim.squash - 13 * anim.squashV) * dt; anim.squash += anim.squashV * dt;
  anim.mouth = Math.max(shots.some(s => s.u > .25) ? .75 : 0, anim.mouth - dt * 2.4);
  anim.fling = Math.min(1, anim.fling + dt / .3);
  anim.zoom = 1 + (anim.zoom - 1) * Math.exp(-dt * 3.4);
  par.x += (par.tx - par.x) * Math.min(1, dt * 6); par.y += (par.ty - par.y) * Math.min(1, dt * 6);
  for (let i = shots.length - 1; i >= 0; i--) { const s = shots[i]; s.u += dt / s.dur; if (s.u >= 1) { shots.splice(i, 1); anim.squashV += s.auto ? 1.2 : 3; anim.mouth = Math.max(anim.mouth, .5); } }
  for (let i = drops.length - 1; i >= 0; i--) { const d = drops[i]; d.vy += 760 * dt; d.x += d.vx * dt; d.y += d.vy * dt; d.life -= dt; if (d.life <= 0) drops.splice(i, 1); }
  for (let i = floats.length - 1; i >= 0; i--) { floats[i].life -= dt * 1.1; if (floats[i].life <= 0) floats.splice(i, 1); }
  if (sps > 0 && !reduce) { autoAcc += dt * Math.min(4.5, .35 + Math.log10(1 + sps) * .42); while (autoAcc >= 1) { autoAcc -= 1; launch(true); if (Math.random() < .35) splash(1); } }
  if (vial) { vial.age += dt; if (vial.age > 13) { vial = null; vialIn = 30 + Math.random() * 30; } }
  else if (state.life >= 30 && peek == null) { vialIn -= real; if (vialIn <= 0) vial = { x: 120 + Math.random() * 720, y: 120 + Math.random() * 60, age: 0, seed: Math.random() * 6, px: -99, py: -99 }; }
  if (toastT > 0) { toastT -= real; if (toastT <= 0) $('toast').hidden = true; }
  if (bannerT > 0) { bannerT -= real; if (bannerT <= 0) $('banner').hidden = true; }
  if (resetArm > 0) { resetArm -= real; if (resetArm <= 0) $('resetBtn').textContent = 'Start over'; }
  uiT += real; if (uiT >= .15) { uiT = 0; refresh(); }
  saveT += real; if (saveT >= 10) { saveT = 0; save(); }
}
let lastNow = 0;
function frame(now) {
  const real = clamp((now - lastNow) / 1000, 0, 3600); lastNow = now;       // a hidden tab still earns when you come back to it
  step(real, Math.min(real, .05)); render(now / 1000);
  requestAnimationFrame(frame);
}

/* ---------- hands on ---------- */
function scenePoint(e) { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H]; }
cv.addEventListener('pointerdown', e => {
  const [x, y] = scenePoint(e);
  if (vial && Math.hypot(x - vial.px, y - vial.py) < 56) collectVial(); else feed(x, y);
});
cv.addEventListener('keydown', e => {
  if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); if (vial) collectVial(); else feed(SCENES[view().k].goop.x, Math.max(60, anim.cy - anim.r - 20)); }
  else if (e.key === ' ') e.preventDefault();
});
window.addEventListener('pointermove', e => {
  const [x, y] = scenePoint(e); anim.lookX = x; anim.lookY = y;
  if (!reduce && e.pointerType !== 'touch') { par.tx = clamp(x / W * 2 - 1, -1, 1); par.ty = clamp(y / H * 2 - 1, -1, 1); }
});
$('feeders').addEventListener('click', e => { const b = e.target.closest('button[data-f]'); if (b) buy(b); });
$('ups').addEventListener('click', e => { const b = e.target.closest('button[data-u]'); if (b) buy(b); });
$('hopBtn').addEventListener('click', hop); $('hopSmall').addEventListener('click', hop);
$('stayBtn').addEventListener('click', () => { $('win').hidden = true; refresh(); });
$('soundBtn').addEventListener('click', () => { prefs.sound = !prefs.sound; paintSound(); save(); if (prefs.sound) sfx.buy(); });
function paintSound() { $('soundBtn').textContent = prefs.sound ? 'Sound on' : 'Sound off'; $('soundBtn').setAttribute('aria-pressed', prefs.sound); }
$('resetBtn').addEventListener('click', () => {
  if (resetArm <= 0) { resetArm = 4; $('resetBtn').textContent = 'Wipe everything? Click again'; return; }
  resetArm = 0; $('resetBtn').textContent = 'Start over'; state = newState(); peek = null; paintPeek(); $('win').hidden = true; vial = null; vialIn = 38;
  shots.length = drops.length = floats.length = 0; buildFeeders(); refresh(); save(); toast('Fresh petri dish. One gram of goop.');
});
function paintPeek() {
  document.querySelectorAll('#peek button').forEach(b => b.setAttribute('aria-pressed', String(peek === +b.dataset.k)));
  $('peekchip').hidden = peek == null; if (peek != null) $('peekchip').textContent = 'Peeking at stage ' + (peek + 1) + ': ' + STAGES[peek].name;
}
STAGES.forEach((s, k) => {
  const b = document.createElement('button'); b.type = 'button'; b.className = 'ghost'; b.dataset.k = k; b.textContent = (k + 1) + '. ' + s.name; b.setAttribute('aria-pressed', 'false');
  b.addEventListener('click', () => { peek = peek === k ? null : k; shots.length = 0; paintPeek(); });
  $('peek').appendChild(b);
});
window.addEventListener('resize', fit);
if (window.ResizeObserver) new ResizeObserver(fit).observe(cv);
document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
window.addEventListener('pagehide', save);

/* ---------- go ---------- */
function start(data) {
  let away = 0;
  if (data && data.state) away = adopt(data);
  else { try { away = adopt(JSON.parse(localStorage.getItem(KEY) || 'null')); } catch (e) { away = 0; } }
  fit(); paintSound(); buildFeeders(); refresh();
  anim.r = SCENES[state.stage].goop.r0;
  const idle = slopPerSec(state) * Math.min(away, 7200) * .5;            // half speed while the game is closed, for up to two hours
  if (away > 60 && idle > 0) { gain(idle); toast('While you were out, the goop ate ' + fmt(idle) + ' slop on its own.'); refresh(); }
  lastNow = performance.now(); requestAnimationFrame(frame);
}
start();

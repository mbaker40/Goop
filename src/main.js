/* Feed the Goop: the browser game. Wires the pure rules (econ, events, prestige, stats, achievements,
   save) to the canvas, the page and the platform adapters, and runs the clock. */
import './style.css';
import { W, H, reduce, clamp } from './draw.js';
import { SCENES } from './scenes/index.js';
import { ASCEND_BONUS, OFFLINE_GRACE, newState, feederCost, slopPerSec, baseRate, feedValue, earn, clickGate, awayEarnings, UPGRADES } from './econ.js';
import { EVENTS, FIRST_EVENT, VIAL_LIFE, pickEvent, nextGap, applyEffect, isHazard, isChoice, tickEventClock } from './events.js';
import { hop as hopRun, buyPerk, clickCap, eventLifeMult, spawnGapMult, offlineCap, PERKS } from './prestige.js';
import { recordStage, recordEvent, recordFeed, newRun, bump, SUN } from './stats.js';
import { checkBadges, BADGE_BY_ID } from './achievements.js';
import { loadSave, writeSave, exportString, importString } from './save.js';
import { platform } from './platform/index.js';
import { fmt } from './fmt.js';
import { G, anim, par, shots, drops, floats, view, mouthPoint, clearStage } from './game.js';
import { sfx } from './audio.js';
import { initCanvas, fit, render } from './render.js';
import * as ui from './ui.js';

const { $ } = ui;
const { storage, achievements, scores, identity } = platform;
const cv = $('scene');
initCanvas(cv);

/* ---------- saving: one versioned blob through the storage adapter (see save.js) ---------- */
function snapshot() {
  return { v: 2, at: Date.now(), prefs: { ...G.prefs }, state: G.state, stats: G.stats, badges: achievements.earned(), bests: scores.all(), profile: identity.snapshot() };
}
function save() { writeSave(storage, snapshot()); }
function adopt(d) {
  G.state = d.state; G.stats = d.stats; G.prefs.sound = d.prefs.sound;
  achievements.load(d.badges); scores.load(d.bests); identity.load(d.profile);
  G.badgeCount = achievements.count();
}
function badges() {
  const names = [];
  for (const id of checkBadges(G.state, G.stats, id => achievements.has(id))) if (achievements.unlock(id)) names.push(BADGE_BY_ID[id].name);
  if (names.length) { G.badgeCount = achievements.count(); ui.award(names); sfx.badge(); save(); }
}

/* ---------- playing ---------- */
function gain(n) {
  if (!(n > 0)) return;
  G.stats.lifetimeSlop += n;
  if (earn(G.state, n)) onStage();
  if (G.state.won && !G.state.winSeen) win();
}
function launch(auto) {
  if (shots.length > 36) return;
  const { k } = view(), sc = SCENES[k], m = mouthPoint();
  const from = auto ? [Math.random() < .5 ? -30 : W + 30, 60 + Math.random() * 300] : sc.hand;
  shots.push({ x0: from[0], y0: from[1], x1: m[0], y1: m[1], u: 0, dur: auto ? .7 : .42, k, kind: Math.random() < .5 ? 0 : 1, rot: Math.random() * 6, spin: (Math.random() - .5) * 9, sc: auto ? .75 : 1.05, auto });
}
function splash(n, col) {
  const g = SCENES[view().k].goop;
  for (let i = 0; i < n && drops.length < 70; i++) { const a = -Math.PI / 2 + (Math.random() - .5) * 2.2; drops.push({ x: g.x + Math.cos(a) * anim.r * .8, y: anim.cy + Math.sin(a) * anim.r * .8, vx: Math.cos(a) * (90 + Math.random() * 160), vy: Math.sin(a) * (150 + Math.random() * 190), life: .9, r: 4 + Math.random() * 5, col }); }
}
function feed(x, y) {
  const s = G.state, st = G.stats;
  anim.squashV += 7; anim.fling = 0; anim.mouth = 1;
  launch(false); splash(2);
  // the click cap: past it a feed still flies and splashes, but pays nothing and counts for nothing
  const paid = clickGate(G.clickTimes, performance.now(), clickCap(s));
  recordFeed(st, paid);
  if (paid) {
    const v = feedValue(s);
    s.feeds++;
    floats.push({ x, y, txt: '+' + fmt(v), life: 1 }); if (floats.length > 24) floats.shift();
    sfx.feed(); gain(v);
  } else sfx.full();
}
function onStage() {
  const s = G.state;
  anim.zoom = reduce ? 1 : 1.6; shots.length = 0;
  for (let k = 1; k <= s.stage; k++) recordStage(G.stats, k, s.played);
  ui.banner(s.stage); sfx.stage(); ui.buildFeeders(); ui.refresh();
}
function win() {
  const s = G.state;
  s.winSeen = true; G.stats.wins++;
  recordStage(G.stats, SUN, s.played); scores.submit('sun', s.played);
  ui.showWin(); save(); badges();
}
function hop() {
  const { state, dust } = hopRun(G.state);
  G.state = state; G.stats.hops++;
  newRun(G.stats, state.stage); scores.submit('hops', G.stats.hops);
  $('win').hidden = true; G.ev = null; G.evIn = FIRST_EVENT; clearStage(); ui.closeSheets();
  anim.r = SCENES[state.stage].goop.r0;
  ui.buildFeeders(); ui.refresh(); save();
  ui.toast('A fresh star system. Everything now earns ' + Math.round(state.asc * ASCEND_BONUS * 100) + '% more, and you picked up ' + dust + ' Star Dust.');
  badges();
}

/* ---------- events: the deck lives in events.js; this is where they appear, get caught or get away ---------- */
function spawnEvent(forced) {
  const s = G.state, def = forced || pickEvent(EVENTS, s.stage, Math.random);
  const life = (isHazard(def) ? def.window : VIAL_LIFE) * eventLifeMult(s);
  let targets;
  if (isChoice(def)) {
    const cx = 230 + Math.random() * 500, y = 130 + Math.random() * 50;
    targets = def.options.map((o, i) => ({ look: o.look, label: o.label, x: cx + (i ? 80 : -80), y, opt: i, px: -99, py: -99 }));
  } else targets = [{ look: def.look, x: 120 + Math.random() * 720, y: isHazard(def) ? 170 + Math.random() * 40 : 120 + Math.random() * 60, opt: 0, px: -99, py: -99 }];
  G.ev = { def, age: 0, life, seed: Math.random() * 6, targets };
  bump(G.stats.seen, def.id);
  if (isHazard(def)) sfx.visitor();
  ui.announce(isChoice(def) ? 'Two vials: ' + def.options.map((o, i) => (i + 1) + ', ' + o.label).join('; ') + '. Press 1 or 2 to pick one.'
    : isHazard(def) ? def.name + ' is here. Press Space or tap him to shoo him away.'
    : def.name + ' appeared. Press Space or tap it to grab it.');
}
function collectEvent(i) {
  const ev = G.ev; if (!ev) return;
  const s = G.state, st = G.stats, def = ev.def, tg = ev.targets[i] || ev.targets[0];
  const effect = isHazard(def) ? def.tap : isChoice(def) ? def.options[tg.opt].effect : def.effect;
  const res = applyEffect(s, effect, Math.random);
  recordEvent(st, def.id, true);
  if (isHazard(def)) st.hazardsTapped++;
  if (res.won === true) st.gambleWins++; else if (res.won === false) st.gambleLosses++;
  G.ev = null; G.evIn = nextGap(true, Math.random, spawnGapMult(s));
  if (res.text) ui.toast(res.text);
  if (res.lost > 0) { sfx.spill(); splash(8, '#8fdc2f'); } else { sfx.vial(); splash(res.gain > 0 ? 16 : 6); }
  anim.squashV += 9; ui.announce('');
  gain(res.gain);
  ui.refresh(); badges();
}
function expireEvent() {
  const s = G.state, def = G.ev.def;
  recordEvent(G.stats, def.id, false);
  if (isHazard(def)) {
    const res = applyEffect(s, def.miss, Math.random);
    G.stats.hazardsMissed++; if (res.text) ui.toast(res.text); sfx.spill();
  }
  G.ev = null; G.evIn = nextGap(false, Math.random, spawnGapMult(s)); ui.announce('');
  ui.refresh(); badges();
}
// TODO(follow-up): larger touch targets at phone widths (a 56-unit radius is about 39 px at 390 wide).
function hitEvent(x, y) {
  if (!G.ev) return -1;
  let best = -1, bd = Infinity;
  G.ev.targets.forEach((tg, i) => { const d = Math.hypot(x - tg.px, y - tg.py); if (d < (isHazard(G.ev.def) ? 66 : 56) && d < bd) { bd = d; best = i; } });
  return best;
}

/* ---------- time: one rule for being away, hidden tab or closed (econ.awayEarnings) ---------- */
const AWAY_GAP = 2;                 // a frame gap longer than this is treated as time away
// TODO(follow-up): across a short stall (2 to 60 s) pay boosts and freezes for the part of the gap they
// actually covered, instead of base rate with the timers simply run down.
function returnFrom(secs) {
  const s = G.state;
  const n = awayEarnings(baseRate(s), secs, offlineCap(s));
  s.frenzy = Math.max(0, s.frenzy - secs); s.freeze = Math.max(0, s.freeze - secs);
  if (n > 0) gain(n);
  if (secs > OFFLINE_GRACE && n > 0) {
    G.stats.offlineReturns++; G.stats.offlineSlop += n;
    ui.toast('While you were out, the goop ate ' + fmt(n) + ' slop on its own.');
  }
  ui.refresh(); badges();
}
let uiT = 0, saveT = 0, badgeT = 0, resetArm = 0, autoAcc = 0;
function step(real, dt) {
  const s = G.state, st = G.stats, sps = slopPerSec(s);
  if (sps > 0) gain(sps * real);
  if (s.frenzy > 0) s.frenzy = Math.max(0, s.frenzy - real);
  if (s.freeze > 0) s.freeze = Math.max(0, s.freeze - real);
  if (!s.won) s.played += real;
  st.playSecs += real;
  if (sps > st.peakSps) st.peakSps = sps;
  anim.squashV += (-190 * anim.squash - 13 * anim.squashV) * dt; anim.squash += anim.squashV * dt;
  anim.mouth = Math.max(shots.some(q => q.u > .25) ? .75 : 0, anim.mouth - dt * 2.4);
  anim.fling = Math.min(1, anim.fling + dt / .3);
  anim.zoom = 1 + (anim.zoom - 1) * Math.exp(-dt * 3.4);
  par.x += (par.tx - par.x) * Math.min(1, dt * 6); par.y += (par.ty - par.y) * Math.min(1, dt * 6);
  for (let i = shots.length - 1; i >= 0; i--) { const q = shots[i]; q.u += dt / q.dur; if (q.u >= 1) { shots.splice(i, 1); anim.squashV += q.auto ? 1.2 : 3; anim.mouth = Math.max(anim.mouth, .5); } }
  for (let i = drops.length - 1; i >= 0; i--) { const d = drops[i]; d.vy += 760 * dt; d.x += d.vx * dt; d.y += d.vy * dt; d.life -= dt; if (d.life <= 0) drops.splice(i, 1); }
  for (let i = floats.length - 1; i >= 0; i--) { floats[i].life -= dt * 1.1; if (floats[i].life <= 0) floats.splice(i, 1); }
  if (sps > 0 && !reduce) { autoAcc += dt * Math.min(4.5, .35 + Math.log10(1 + sps) * .42); while (autoAcc >= 1) { autoAcc -= 1; launch(true); if (Math.random() < .35) splash(1); } }
  const tick = tickEventClock(G, { real, dt, life: s.life, peek: G.peek, covered: canvasCovered() });
  if (tick === 'expire') expireEvent(); else if (tick === 'spawn') spawnEvent();
  ui.tickUi(real);
  if (resetArm > 0) { resetArm -= real; if (resetArm <= 0) $('resetBtn').textContent = 'Start over'; }
  uiT += real; if (uiT >= .15) { uiT = 0; ui.refresh(); }
  badgeT += real; if (badgeT >= 1) { badgeT = 0; scores.submit('peak', st.peakSps); badges(); }
  saveT += real; if (saveT >= 10) { saveT = 0; save(); }
}
let lastNow = 0;
function frame(now) {
  let real = Math.max(0, (now - lastNow) / 1000); lastNow = now;
  if (real > AWAY_GAP) { returnFrom(real); real = 0; }       // the tab was hidden, or the device slept
  step(real, Math.min(real, .05)); render(now / 1000);
  requestAnimationFrame(frame);
}

/* ---------- hands on ---------- */
function canvasCovered() { return !$('win').hidden || ui.sheetOpen(); }
function scenePoint(e) { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H]; }
function feedFromKeys() { feed(SCENES[view().k].goop.x, Math.max(60, anim.cy - anim.r - 20)); }
cv.addEventListener('pointerdown', e => {
  const [x, y] = scenePoint(e), hit = hitEvent(x, y);
  G.stats.clicks++;
  if (hit >= 0) collectEvent(hit); else feed(x, y);
});
cv.addEventListener('keydown', e => {
  const k = e.key, pick = k === '1' || k === '2' || k === 'ArrowLeft' || k === 'ArrowRight';
  if ((k === ' ' || k === 'Enter') && !e.repeat) { e.preventDefault(); G.stats.clicks++; if (G.ev) collectEvent(0); else feedFromKeys(); }
  else if (k === ' ') e.preventDefault();
  else if (pick && G.ev && isChoice(G.ev.def) && !e.repeat) { e.preventDefault(); G.stats.clicks++; collectEvent(k === '2' || k === 'ArrowRight' ? 1 : 0); }
});
// The event keys also work from anywhere on the page (say, focus on a shop button), so a keyboard
// player can grab a vial or shoo a visitor without tabbing back to the canvas. Only while an event is
// on stage and nothing that takes keys has focus; feeding by key stays on the canvas.
document.addEventListener('keydown', e => {
  if (e.target === cv || !G.ev || e.repeat || e.ctrlKey || e.metaKey || e.altKey || canvasCovered()) return;
  const t = e.target, tag = t && t.tagName;
  if (tag === 'BUTTON' || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (t && t.isContentEditable)) return;
  const k = e.key;
  if (k === ' ' || k === 'Enter') { e.preventDefault(); G.stats.clicks++; collectEvent(0); }
  else if ((k === '1' || k === '2' || k === 'ArrowLeft' || k === 'ArrowRight') && isChoice(G.ev.def)) { e.preventDefault(); G.stats.clicks++; collectEvent(k === '2' || k === 'ArrowRight' ? 1 : 0); }
});
window.addEventListener('pointermove', e => {
  const [x, y] = scenePoint(e); anim.lookX = x; anim.lookY = y;
  if (!reduce && e.pointerType !== 'touch') { par.tx = clamp(x / W * 2 - 1, -1, 1); par.ty = clamp(y / H * 2 - 1, -1, 1); }
});
function buy(el) {
  const s = G.state;
  if (el.dataset.f != null) {
    const i = +el.dataset.f, c = feederCost(s, i);
    if (s.slop < c) return; s.slop -= c; s.own[i]++; G.stats.feedersBought++;
  } else {
    const u = UPGRADES.find(q => q.id === el.dataset.u);
    if (!u || s.slop < u.cost || s.ups[u.id]) return; s.slop -= u.cost; s.ups[u.id] = true; G.stats.upgradesBought++;
  }
  sfx.buy(); anim.squashV += 3; ui.refresh(); badges();
}
$('feeders').addEventListener('click', e => { const b = e.target.closest('button[data-f]'); if (b) buy(b); });
$('ups').addEventListener('click', e => { const b = e.target.closest('button[data-u]'); if (b) buy(b); });
$('hopBtn').addEventListener('click', hop); $('hopSmall').addEventListener('click', hop);
$('stayBtn').addEventListener('click', () => { $('win').hidden = true; ui.refresh(); });
$('soundBtn').addEventListener('click', () => { G.prefs.sound = !G.prefs.sound; ui.paintSound(); save(); if (G.prefs.sound) sfx.buy(); });
$('resetBtn').addEventListener('click', () => {
  if (resetArm <= 0) { resetArm = 4; $('resetBtn').textContent = 'Wipe everything? Click again'; return; }
  resetArm = 0; $('resetBtn').textContent = 'Start over';
  G.state = newState(); G.peek = null; ui.paintPeek(); $('win').hidden = true; G.ev = null; G.evIn = FIRST_EVENT; ui.announce('');
  newRun(G.stats); clearStage(); anim.r = SCENES[0].goop.r0; ui.buildFeeders(); ui.refresh(); save();
  ui.toast('Fresh petri dish. One gram of goop. Your trophies stay on the shelf.');
});

// trophy shelf and Star Dust
function openShelf() { ui.renderShelf(achievements, scores, identity); ui.openSheet('shelf'); }
function openPerks() { ui.renderPerks(); ui.openSheet('perks'); }
$('shelfBtn').addEventListener('click', openShelf);
$('dustBtn').addEventListener('click', openPerks);
$('winPerks').addEventListener('click', openPerks);
$('perkList').addEventListener('click', e => {
  const b = e.target.closest('button[data-perk]');
  if (!b || !buyPerk(G.state, b.dataset.perk)) return;
  G.stats.perksBought++; sfx.buy();
  ui.toast(PERKS.find(p => p.id === b.dataset.perk).name + ': yours for good.');
  ui.renderPerks(); ui.refresh(); save(); badges();
});
for (const id of ['shelf', 'perks']) $(id).addEventListener('click', e => { if (e.target.id === id || e.target.closest('[data-close]')) ui.closeSheets(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && ui.sheetOpen()) { e.preventDefault(); ui.closeSheets(); } });

// export and import
$('exportBtn').addEventListener('click', async () => {
  G.stats.exports++; save();
  const str = exportString(snapshot());
  try { await navigator.clipboard.writeText(str); ui.toast('Save copied. Keep it somewhere safe, or paste it into Load save on another device.'); }
  catch (e) { window.prompt('Copy your save:', str); }
  badges();
});
$('importBtn').addEventListener('click', () => {
  const str = window.prompt('Paste a save you copied earlier. It replaces the goop you have now.');
  if (!str) return;
  try {
    adopt(importString(str));
    G.peek = null; G.ev = null; G.evIn = FIRST_EVENT; G.clickTimes.length = 0; clearStage(); $('win').hidden = true; ui.closeSheets();
    anim.r = SCENES[G.state.stage].goop.r0;
    ui.paintSound(); ui.paintPeek(); ui.buildFeeders(); ui.refresh(); save();
    ui.toast('Save loaded. The goop remembers you.'); badges();
  } catch (e) { ui.toast(e.message); }
});

ui.buildPeek(k => { G.peek = G.peek === k ? null : k; shots.length = 0; ui.paintPeek(); if (G.peek != null) { bump(G.stats.peeked, k); badges(); } });
window.addEventListener('resize', fit);
if (window.ResizeObserver) new ResizeObserver(fit).observe(cv);
document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
window.addEventListener('pagehide', save);

/* ---------- go ---------- */
function start() {
  const { data, from } = loadSave(storage);
  if (data) adopt(data);
  fit(); ui.paintSound(); ui.buildFeeders(); ui.refresh();
  anim.r = SCENES[G.state.stage].goop.r0;
  const away = data && data.at ? Math.max(0, (Date.now() - data.at) / 1000) : 0;
  if (away > 0) returnFrom(away);
  if (from === 'v1') {
    save();                          // writes the v2 key; the v1 key stays untouched as a backup
    if (G.state.dust > 0) ui.award([G.state.dust + ' Star Dust for your ' + G.stats.hops + ' past hop' + (G.stats.hops > 1 ? 's' : '') + '. Spend it in the shop.'], 'New in the lab');
  }
  badges();
  lastNow = performance.now(); requestAnimationFrame(frame);
}
start();

// Development only (stripped from the production build): poke the game from the console or a test.
if (import.meta.env.DEV) window.__goop = { G, EVENTS, spawn: id => spawnEvent(EVENTS.find(e => e.id === id)), save, badges };

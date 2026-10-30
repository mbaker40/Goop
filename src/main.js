/* Feed the Goop: the browser game. Wires the pure rules (econ, events, prestige, stats, achievements,
   save, daily, away, share) to the canvas, the page and the platform adapters, and runs the clock. */
import './style.css';
import { W, H, reduce, clamp, setReduce, systemReduce } from './draw.js';
import { SCENES } from './scenes/index.js';
import { OFFLINE_GRACE, SUN_AT, STAGES, END, FEEDERS, newState, feederCost, slopPerSec, feedValue, earn, clickGate, awayPay, UPGRADES, upgradeCost, canEatRest, eatRest, stageSpan } from './econ.js';
import { EVENTS, FIRST_EVENT, VIAL_LIFE, pickWithPity, nextGap, applyEffect, isHazard, isChoice, tickEventClock, grabTarget, riskNote, hitRadius, tickDuel, duelFeed } from './events.js';
import { hop as hopRun, canHop, buyPerk, clickCap, eventLifeMult, spawnGapMult, offlineCap, milestoneMult, PERKS, pityDue, echoDue, dailyWeekMult } from './prestige.js';
import { recordStage, recordEvent, recordFeed, recordGamble, recordVisitor, cleanRun, flag, markSkipped, newRun, bump, seedUnknownStages, runClaim, SUN, UNIVERSE } from './stats.js';
import { newLegends, LEGEND_AT } from './legends.js';
import { passMilestones, seedMilestones } from './milestones.js';
import { moodOf, pickThought, remember } from './mood.js';
import { BEATS, LENGTH, cuesBetween, canSkip, frameAt, interruptedEnding } from './cutscene.js';
import { checkBadges, BADGE_BY_ID } from './achievements.js';
import { loadSave, writeSave, exportString, importString, saveHealth, SAVE_VERSION, CORRUPT_KEY } from './save.js';
import { rulesOf, loadDaily, writeDaily, retryDaily, dailyFinished, dailyDeck, weekKey, MUTATOR_BY_ID, HANDS_IDLE } from './daily.js';
import { awayReport, burpBonus, awayFor } from './away.js';
import { shareModel, GAME_URL } from './share.js';
import { drawShareCard, copyCard, shareCard } from './sharecard.js';
import { platform } from './platform/index.js';
import { fmt, clock, setNumberStyle } from './fmt.js';
import { rng } from './rng.js';
import { G, anim, par, shots, drops, floats, view, mouthPoint, clearStage, mainRun } from './game.js';
import { sfx } from './audio.js';
import { buzz, BUZZ } from './haptics.js';
import { initPwa } from './pwa.js';
import { initCanvas, fit, render } from './render.js';
import * as ui from './ui.js';
import * as panels from './panels.js';

const { $ } = ui;
const { storage, achievements, scores, identity } = platform;
const cv = $('scene');
initCanvas(cv);
G.rules = rulesOf(null); G.deck = EVENTS;

/* ---------- saving: one versioned blob through the storage adapter (see save.js) ---------- */
// The main save always holds the main run, also while the daily goop is on stage (then `at` stays at the
// moment the main goop was left, so it is paid for the time away). The daily has its own slot.
function snapshot() {
  const m = mainRun();
  return { v: SAVE_VERSION, at: G.main ? G.main.leftAt : Date.now(), prefs: { ...G.prefs }, state: m.state, stats: m.stats, badges: achievements.earned(), bests: scores.all(), profile: identity.snapshot() };
}
function save() {
  writeSave(storage, snapshot());
  if (G.daily) { G.daily.at = Date.now(); writeDaily(storage, G.daily); }
}
function adopt(d) {
  G.state = d.state; G.stats = d.stats; G.prefs = { ...d.prefs };
  achievements.load(d.badges); scores.load(d.bests); identity.load(d.profile);
  G.badgeCount = achievements.count();
  seedUnknownStages(G.stats, G.state.stage); markSkipped(G.stats, G.state.startStage);
  applyPrefs();
  quietLegends();
}
/* ---------- feeder legends (legends.js): 100 and 500 of one feeder ---------- */
const FEEDER_IDS = FEEDERS.map(f => f.id);
// A save that already has them (loaded, imported, or a daily swapped in): titles and multipliers apply at
// once, the badges come with the next check, and one quiet note says so. No set piece replays.
function quietLegends() {
  const s = G.state, fresh = newLegends(FEEDER_IDS, s.own, s.legends);
  if (!fresh.length) return;
  for (const n of fresh) s.legends = { ...s.legends, [n.id + ':' + n.level]: true };
  const top = fresh.filter((n, i) => !fresh.some((m, j) => j > i && m.id === n.id));
  ui.award([top.map(n => (n.level === 2 ? n.legend.t2 : n.legend.t1)).join(', ') + (top.length > 1 ? ' are' : ' is') + ' already on the books.'], 'Feeder legends');
}
// Reaching one in play: the title, a toast, the goop's one-liner; at 500, the set piece and its sound.
function legends() {
  const s = G.state, fresh = newLegends(FEEDER_IDS, s.own, s.legends);
  for (const n of fresh) {
    s.legends = { ...s.legends, [n.id + ':' + n.level]: true };
    const l = n.legend, name = n.level === 2 ? l.t2 : l.t1;
    ui.award([name + '. ' + FEEDERS[FEEDER_IDS.indexOf(n.id)].name + ' x' + LEGEND_AT[n.level - 1] + ': they now work ' + (n.level === 2 ? 'six' : 'twice') + ' times as hard.'], n.level === 2 ? 'Legendary' : 'Feeder legend');
    G.mood.text = n.level === 2 ? l.say2 : l.say1; G.mood.life = 4.6; G.mood.next = 18;
    if (n.level === 2) { G.piece = { id: n.id, t: 0 }; ui.announce(l.line); sfx.legend(); buzz(BUZZ.stage); }
    else sfx.badge();
  }
  if (fresh.length) ui.refresh();
}
// Badges read the main run only: nothing in the daily goop counts towards them except finishing it.
function badges() {
  const m = mainRun(), names = [];
  for (const id of checkBadges(m.state, m.stats, id => achievements.has(id))) if (achievements.unlock(id)) { names.push(BADGE_BY_ID[id].name); m.stats.runBadges.push(id); }
  if (names.length) { G.badgeCount = achievements.count(); ui.award(names); sfx.badge(); save(); }
}
/* ---------- settings (prefs live in the save) ---------- */
function applyPrefs() {
  setNumberStyle(G.prefs.numbers);
  setReduce(G.prefs.motion === 'system' ? systemReduce : G.prefs.motion === 'reduce');
  document.documentElement.classList.toggle('reduce', reduce);
}

/* ---------- playing ---------- */
let week = weekKey(), weekT = 0;
function gain(n) {
  if (!(n > 0)) return;
  G.stats.lifetimeSlop += n;
  if (!G.daily) scores.add('week', n, week);       // the weekly board counts the main goop's slop
  if (earn(G.state, n)) onStage();
  winCheck();
  milestones();
}
function winCheck() {
  if (G.daily) { if (G.daily.done == null && dailyFinished(G.state)) finishDaily(); }
  else if (G.state.won && !G.state.winSeen) win();
}
// Mid-stage milestones (milestones.js): a toast, a small bonus, and sometimes a prop goes missing.
function milestones() {
  const passed = passMilestones(G.state, milestoneMult(G.state));
  if (!passed.length) return;
  for (const { m, bonus } of passed) {
    G.stats.milestones++;
    ui.award([m.name + '. +' + fmt(bonus) + ' slop.'], 'Milestone', 'mile');
    if (m.id === 'w-sound') { sfx.gulp(); if (!G.prefs.sound) flag(mainRun().stats, 'muteEat'); } else sfx.mile();
    G.stats.lifetimeSlop += bonus;
    if (earn(G.state, bonus)) onStage();
  }
  winCheck();
  ui.refresh();
  milestones();                      // a bonus can carry the goop over the next one
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
  G.clock.fed = st.playSecs;
  anim.squashV += 7; anim.fling = 0; anim.mouth = 1;
  launch(false); splash(2);
  // the click cap: past it a feed still flies and splashes, but pays nothing and counts for nothing
  const paid = clickGate(G.clickTimes, performance.now(), clickCap(s));
  recordFeed(st, paid);
  if (paid) {
    const v = feedValue(s);
    s.feeds++; duelFeed(s);
    const h = new Date().getHours(); if (h >= 2 && h < 5 && !mainRun().stats.flags.night) flag(mainRun().stats, 'night');
    floats.push({ x, y, txt: '+' + fmt(v), life: 1 }); if (floats.length > 24) floats.shift();
    sfx.feed(); gain(v);
  } else sfx.full();
}
function onStage() {
  const s = G.state;
  anim.zoom = reduce ? 1 : 1.6; shots.length = 0;
  for (let k = 1; k <= s.stage; k++) recordStage(G.stats, k, s.played, s.startStage);
  ui.banner(s.stage); sfx.stage(); buzz(BUZZ.stage); ui.buildFeeders(); ui.refresh();
  for (const { m, bonus } of echoDue(s)) { ui.award(['A Big Bang echo: ' + m.name.toLowerCase() + ', again. +' + fmt(bonus) + ' slop.'], 'Echo', 'mile'); G.stats.lifetimeSlop += bonus; earn(s, bonus); }
}
function win() {
  const s = G.state;
  s.winSeen = true; G.stats.wins++;
  recordStage(G.stats, SUN, s.played, s.startStage); scores.submit('sun', s.played, undefined, runClaim(s));
  ui.showWin(); save(); badges();
}
function hop() {
  if (G.daily || !canHop(G.state)) return;
  const was = G.state, st0 = G.stats;
  if (Math.floor(was.slop) === 0) flag(st0, 'zeroHop');
  if (!was.ate && was.stage >= 16) flag(st0, 'deepHop');
  if (cleanRun(st0)) flag(st0, 'cleanRun');
  const { state, dust, bigBang, bonus } = hopRun(G.state);
  G.state = state; G.stats.hops++;
  if (bigBang) { G.stats.bigBangs++; scores.submit('bigbangs', G.stats.bigBangs); }
  newRun(G.stats, state.stage); scores.submit('hops', G.stats.hops);
  $('win').hidden = true; $('land').hidden = true; G.ev = null; G.evIn = FIRST_EVENT; clearStage(); ui.closeSheets();
  anim.r = SCENES[state.stage].goop.r0; G.clock.hopped = G.clock.fed = G.stats.playSecs;
  ui.buildFeeders(); ui.refresh(); save();
  ui.toast((bigBang ? 'Big Bang! The goop is the new universe, and somewhere in it there is a lab. ' : 'A fresh star system. ') + (bonus > 0 ? 'That hop added +' + Math.round(bonus * 100) + '%: e' : 'E') + 'verything now earns ' + Math.round(state.hopBonus * 100) + '% more, and you picked up ' + dust + ' Star Dust.');
  badges();
}

/* ---------- the end: Eat the Rest, the ending, the landing ---------- */
// Press once to arm, again within four seconds to eat: like Start over, because the first viewing of
// the ending is 68 seconds that cannot be skipped.
function eatTheRest() {
  const s = G.state;
  if (!canEatRest(s)) return;
  if (G.eatArm <= 0) { G.eatArm = 4; $('eatRest').querySelector('.nm').textContent = 'Sure? Press again'; ui.refresh(); return; }
  G.eatArm = 0; $('eatRest').querySelector('.nm').textContent = 'Eat the Rest';
  eatRest(s);
  G.stats.universes++;
  recordStage(G.stats, UNIVERSE, s.played, s.startStage); scores.submit('universe', s.played, undefined, runClaim(s));
  sfx.gulp(); save();
  startCutscene(false);
}
// Closing the tab during the first viewing: start() counts it as seen and shows the landing. Load save and
// Start over stop a playing ending first (stopCutscene). The away card waits until the ending is over.
function startCutscene(replay) {
  G.cut = { t: 0, replay, confirm: 0, beat: -1 };
  G.ev = null; ui.announce(''); clearStage(); ui.closeSheets();
  $('win').hidden = true; $('land').hidden = true; $('toast').hidden = true; $('hint').hidden = true;
  if (!$('away').hidden) { $('away').hidden = true; if (G.away) G.away.shown = false; }   // the away card comes back after the ending
  $('skipBtn').hidden = !canSkip(G.stats); $('skipBtn').textContent = 'Skip the ending';
  cv.setAttribute('aria-label', 'The ending is playing. ' + (canSkip(G.stats) ? 'Press Escape twice, or tap twice, to skip.' : 'It plays through once.'));
  ui.refresh();
}
function stopCutscene() {
  if (!G.cut) return;
  G.cut = null; $('skipchip').hidden = true; $('skipBtn').hidden = true; $('cutlive').textContent = '';
  cv.setAttribute('aria-label', 'Feed the goop');
}
function endCutscene(watched) {
  const c = G.cut; if (!c) return;
  G.cut = null; $('skipchip').hidden = true; $('skipBtn').hidden = true; $('cutlive').textContent = '';
  cv.setAttribute('aria-label', 'Feed the goop');
  if (watched && !c.replay) G.stats.cutsceneSeen++;
  if (!watched) G.stats.cutsceneSkips++;
  if (c.replay) { G.stats.cutsceneReplays++; ui.toast('Back to the lab. The goop is right where you left it.'); }
  else ui.showLanding();
  save(); badges(); ui.refresh();
}
function tickCutscene(real) {
  const c = G.cut;
  if (!c.frozen) {
    const t0 = c.t; c.t += real;
    for (const cue of cuesBetween(t0, c.t)) if (sfx[cue.id]) sfx[cue.id]();
  }
  const f = frameAt(c.t, reduce);
  if (f.index !== c.beat) { c.beat = f.index; $('cutlive').textContent = BEATS[f.index].caption; }
  if (f.card && c.card !== f.card.text) { c.card = f.card.text; $('cutlive').textContent = f.card.text; }
  if (c.confirm > 0) { c.confirm -= real; if (c.confirm <= 0) { $('skipchip').hidden = true; $('skipBtn').textContent = 'Skip the ending'; } }
  if (!c.frozen && c.t >= LENGTH) endCutscene(true);
}
// Tap (or press) once to ask, again within three seconds to skip. Only after one full viewing.
function trySkip() {
  const c = G.cut; if (!c) return;
  if (!canSkip(G.stats)) { $('skipchip').textContent = 'The first time, you watch the whole thing.'; $('skipchip').hidden = false; c.confirm = 2.5; return; }
  if (c.confirm > 0) { endCutscene(false); return; }
  c.confirm = 3; $('skipchip').textContent = 'Tap again to skip'; $('skipchip').hidden = false; $('skipBtn').textContent = 'Press again to skip';
}

/* ---------- the goop's moods and one-liners (mood.js) ---------- */
function tickMood(real) {
  const s = G.state, st = G.stats, now = st.playSecs, m = G.mood;
  const id = m.force || moodOf({ freeze: s.freeze, frenzy: s.frenzy, idle: now - G.clock.fed, sinceCatch: now - G.clock.caught, sinceHop: now - G.clock.hopped, sinceAway: now - G.clock.back });
  if (m.life > 0) { m.life -= real; if (m.life <= 0) m.text = ''; }
  const changed = id !== m.id;
  m.id = id;
  if (changed && id !== 'content') bump(st.moods, id);
  m.next -= real;
  if ((changed && id !== 'content') || (m.next <= 0 && m.life <= 0)) {
    if (G.peek != null || canvasCovered() || s.feeds < 3) { m.next = 4; return; }
    const line = pickThought(id, s.stage, m.recent, Math.random);
    remember(m.recent, line.id); m.text = line.text; m.life = 4.6; m.next = 16 + Math.random() * 10;
  }
}

/* ---------- events: the deck lives in events.js; this is where they appear, get caught or get away ---------- */
// Seconds to the next event: the perks, then the daily's twist (0: no events at all).
function gapAfter(caught) { return G.rules.gapMult === 0 ? Infinity : nextGap(caught, G.rand, spawnGapMult(G.state) * G.rules.gapMult); }
function firstGap() { return G.rules.gapMult === 0 ? Infinity : FIRST_EVENT * G.rules.gapMult; }
function spawnEvent(forced) {
  const s = G.state, pity = !forced && pityDue(s), def = forced || pickWithPity(G.deck, s.stage, G.rand, pity);
  if (pity) { s.missRun = 0; flag(mainRun().stats, 'pity'); ui.toast('Event Pity: three got away, so this one is a sure thing.'); }
  const life = (isHazard(def) ? def.window : VIAL_LIFE) * eventLifeMult(s);
  let targets;
  if (isChoice(def)) {
    const cx = 230 + Math.random() * 500, y = 130 + Math.random() * 50;
    targets = def.options.map((o, i) => ({ look: o.look, label: o.label, x: cx + (i ? 80 : -80), y, opt: i, px: -99, py: -99 }));
  } else targets = [{ look: def.look, x: isHazard(def) ? 150 + Math.random() * 660 : 120 + Math.random() * 720, y: isHazard(def) ? 170 + Math.random() * 40 : 120 + Math.random() * 60, opt: 0, px: -99, py: -99 }];
  G.ev = { def, age: 0, life, seed: Math.random() * 6, targets };
  bump(G.stats.seen, def.id);
  if (isHazard(def)) sfx.visitor();
  const risk = riskNote(def);
  ui.announce((isChoice(def) ? 'Two vials: ' + def.options.map((o, i) => (i + 1) + ', ' + o.label).join('; ') + '. Tap one, or press 1 or 2 (E takes the first).'
    : isHazard(def) ? def.name + ' is here. Tap him or press E to shoo him away.'
    : def.name + ' appeared. Tap it or press E to grab it.') + (risk ? ' ' + risk : ''));
}
function collectEvent(i) {
  const ev = G.ev; if (!ev) return;
  const s = G.state, st = G.stats, def = ev.def, tg = ev.targets[i] || ev.targets[0];
  const effect = isHazard(def) ? def.tap : isChoice(def) ? def.options[tg.opt].effect : def.effect;
  if (ev.life - ev.age < 1) st.lastSecond++;
  const res = applyEffect(s, effect, G.rand);
  recordEvent(st, def.id, true); s.caught = (s.caught | 0) + 1; s.missRun = 0;
  if (isHazard(def)) recordVisitor(st, true);
  if (res.won === true || res.won === false) recordGamble(st, res.won);
  if (s.duel) ui.announce('Click-off: feed the goop ' + s.duel.need + ' times in ' + Math.round(s.duel.left) + ' seconds.');
  G.ev = null; G.evIn = gapAfter(true);
  G.clock.caught = st.playSecs;
  if (res.lottery != null) G.mood.text = ['A little dark matter. Crunchy.', 'Dark mutagen! Wheee.', 'SO much dark matter.', 'It was empty. I am empty.'][res.lottery], G.mood.life = 3.5;
  buzz(BUZZ.catch);
  if (res.text) ui.toast(res.text);
  if (res.lost > 0) { sfx.spill(); splash(8, '#8fdc2f'); } else { sfx.vial(); splash(res.gain > 0 ? 16 : 6); }
  anim.squashV += 9; ui.announce('');
  gain(res.gain);
  ui.refresh(); badges();
}
function expireEvent() {
  const s = G.state, def = G.ev.def;
  recordEvent(G.stats, def.id, false); s.missRun = (s.missRun | 0) + 1;
  if (isHazard(def)) {
    const res = applyEffect(s, def.miss, G.rand);
    recordVisitor(G.stats, false); if (res.text) ui.toast(res.text); sfx.spill();
  }
  G.ev = null; G.evIn = gapAfter(false); ui.announce('');
  ui.refresh(); badges();
}
// Hit test for event targets: the drawn size, grown on a small screen so every target is at least a
// 44 CSS pixel tap (events.hitRadius). At 390 wide that is about a 69-unit radius instead of 56.
function hitEvent(x, y) {
  if (!G.ev) return -1;
  const css = cv.clientWidth ? cv.clientWidth / W : 1, r = hitRadius(isHazard(G.ev.def) ? 66 : 56, css);
  let best = -1, bd = Infinity;
  G.ev.targets.forEach((tg, i) => { const d = Math.hypot(x - tg.px, y - tg.py); if (d < r && d < bd) { bd = d; best = i; } });
  return best;
}

/* ---------- time: one rule for being away, hidden tab or closed (econ.awayPay) ---------- */
const AWAY_GAP = 2;                 // a frame gap longer than this is treated as time away
// A boost or a freeze running when the gap began is paid for the part of the gap it covered (awayPay).
// Past a minute away, the goop's away card comes up: what it ate, a joke, and one burp to double it.
function returnFrom(secs) {
  const s = G.state, mult = G.rules.handsOn ? 0 : G.rules.offline;
  const n = awayPay(s, secs, offlineCap(s)) * mult;
  if (n > 0) gain(n);
  if (secs > OFFLINE_GRACE) G.clock.back = G.clock.fed = G.stats.playSecs;
  const report = awayReport(secs, n, s.stage);
  if (report) {
    G.stats.offlineReturns++; G.stats.offlineSlop += n;
    G.away = report;                 // shown by tickAway when nothing else covers the theatre
  }
  ui.refresh(); badges();
}
function tickAway() {
  const a = G.away;
  if (!a || a.shown || G.cut || !$('win').hidden || !$('land').hidden || !$('dailyEnd').hidden || ui.sheetOpen()) return;
  a.shown = true;
  $('awayFor').textContent = 'You were away for ' + awayFor(a.secs);
  $('awayN').textContent = fmt(a.n); $('awayJoke').textContent = a.joke;
  $('burpBtn').disabled = false; $('burpBtn').textContent = 'Watch the goop burp: double it';
  $('away').hidden = false; $('burpBtn').focus();
}
// Switching goops (into or out of the daily, or a new daily try) with a burp still unclaimed: the goop
// burps on its way out, into the run that earned it, so the doubling is never lost to the switch.
function settleAway() {
  const a = G.away; if (!a) return;
  $('away').hidden = true; G.away = null;
  const n = burpBonus(a);
  if (!(n > 0)) return;
  G.stats.offlineSlop += n; gain(n);
  ui.toast('Before you switched, the goop burped up another ' + fmt(n) + ' slop for the time you were away.');
}
function closeAway() { $('away').hidden = true; G.away = null; ui.refresh(); cv.focus(); }
function watchBurp() {
  const a = G.away, n = burpBonus(a);
  if (!(n > 0)) return;
  $('away').hidden = true; G.away = null;
  G.stats.offlineSlop += n; if (!G.daily) G.stats.burps++; else G.main.stats.burps++;
  const g = SCENES[view().k].goop;
  anim.squashV -= 16; anim.mouth = 1; splash(36); splash(10, '#ffd23f');
  floats.push({ x: g.x, y: Math.max(80, anim.cy - anim.r - 40), txt: '+' + fmt(n), life: 1.6 });
  G.mood.text = 'BURP. Pardon me.'; G.mood.life = 3; G.mood.next = 14;
  sfx.burp(); setTimeout(() => sfx.gulp(), 260); buzz(BUZZ.burp);
  gain(n);
  ui.toast('The goop burped up another ' + fmt(n) + ' slop. It looks very pleased with itself.');
  ui.refresh(); badges(); save(); cv.focus();
}
let uiT = 0, saveT = 0, badgeT = 0, resetArm = 0, autoAcc = 0;
const PIECE_SECS = 4.5;                // a feeder legend's set piece (sprites/legends.js draws it)
function step(real, dt) {
  const s = G.state, st = G.stats;
  G.handsIdle = G.rules.handsOn && st.playSecs - G.clock.fed > HANDS_IDLE;     // the daily's Hands On twist
  const sps = G.handsIdle ? 0 : slopPerSec(s);
  if (sps > 0) gain(sps * real);
  if (s.frenzy > 0) s.frenzy = Math.max(0, s.frenzy - real);
  if (s.freeze > 0) s.freeze = Math.max(0, s.freeze - real);
  if (!s.ate) s.played += real;
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
  if (s.duel && !canvasCovered()) {                    // a click-off with the rival goop (events.js)
    const r = tickDuel(s, real, G.rand);
    if (r) { flag(mainRun().stats, r.won ? 'duelWin' : 'duelLose'); ui.toast(r.text); if (r.won) { sfx.vial(); splash(16); } else sfx.spill(); gain(r.gain); ui.refresh(); badges(); }
  }
  if (G.piece && !G.piece.frozen) { G.piece.t += real; if (G.piece.t > PIECE_SECS) G.piece = null; }
  const tick = tickEventClock(G, { real, dt, life: s.life, peek: G.peek, covered: canvasCovered() });
  if (tick === 'expire') expireEvent(); else if (tick === 'spawn') spawnEvent();
  if (G.cut) tickCutscene(real); else tickMood(real);
  if (G.away && !G.away.shown) tickAway();
  if (G.daily) $('dailyBarClock').textContent = clock(G.daily.done != null ? G.daily.done : s.played);
  ui.tickUi(real);
  if (resetArm > 0) { resetArm -= real; if (resetArm <= 0) $('resetBtn').textContent = 'Start over'; }
  if (G.eatArm > 0) { G.eatArm -= real; if (G.eatArm <= 0) { $('eatRest').querySelector('.nm').textContent = 'Eat the Rest'; ui.refresh(); } }
  uiT += real; if (uiT >= .15) { uiT = 0; ui.refresh(); }
  badgeT += real; if (badgeT >= 1) { badgeT = 0; if (!G.daily) scores.submit('peak', st.peakSps); legends(); badges(); }
  weekT += real; if (weekT >= 30) { weekT = 0; week = weekKey(); }
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
function canvasCovered() { return !$('win').hidden || !$('land').hidden || !!G.cut || ui.sheetOpen() || ui.coverOpen(); }
function scenePoint(e) { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H]; }
function feedFromKeys() { feed(SCENES[view().k].goop.x, Math.max(60, anim.cy - anim.r - 20)); }
cv.addEventListener('pointerdown', e => {
  if (G.cut) { trySkip(); return; }
  const [x, y] = scenePoint(e), hit = hitEvent(x, y);
  G.stats.clicks++;
  if (hit >= 0) collectEvent(hit); else feed(x, y);
});
// Space and Enter on the canvas feed the goop, or grab the event on stage.
cv.addEventListener('keydown', e => {
  const k = e.key;
  if (G.cut) { if ((k === ' ' || k === 'Enter') && !e.repeat) { e.preventDefault(); trySkip(); } return; }
  if ((k === ' ' || k === 'Enter') && !e.repeat) { e.preventDefault(); G.stats.clicks++; if (G.ev) collectEvent(0); else feedFromKeys(); }
  else if (k === ' ') e.preventDefault();
});
// Event keys from anywhere on the page, so a keyboard player never has to tab back to the canvas:
// E (or G), 1/2 and the arrows work everywhere except text fields, a focused shop button included.
// Space and Enter also work from the page body, but not on a button, which they press.
document.addEventListener('keydown', e => {
  if (!G.ev || e.repeat || e.ctrlKey || e.metaKey || e.altKey || canvasCovered()) return;
  const t = e.target, tag = t && t.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (t && t.isContentEditable)) return;
  let i = grabTarget(e.key, isChoice(G.ev.def));
  if (i < 0 && (e.key === ' ' || e.key === 'Enter') && t !== cv && tag !== 'BUTTON') i = 0;
  if (i < 0) return;
  e.preventDefault(); G.stats.clicks++; collectEvent(i);
});
window.addEventListener('pointermove', e => {
  const [x, y] = scenePoint(e); anim.lookX = x; anim.lookY = y;
  if (!reduce && e.pointerType !== 'touch') { par.tx = clamp(x / W * 2 - 1, -1, 1); par.ty = clamp(y / H * 2 - 1, -1, 1); }
});
function buy(el) {
  const s = G.state;
  if (el.dataset.f != null) {
    const i = +el.dataset.f, c = feederCost(s, i);
    if (s.slop < c) return; s.slop -= c; s.own[i]++; s.lastBuy = c; G.stats.feedersBought++;
  } else {
    const u = UPGRADES.find(q => q.id === el.dataset.u), c = u && upgradeCost(s, u);
    if (!u || s.slop < c || s.ups[u.id]) return; s.slop -= c; s.ups[u.id] = true; s.lastBuy = c; G.stats.upgradesBought++;
  }
  sfx.buy(); anim.squashV += 3; legends(); ui.refresh(); badges();
}
$('feeders').addEventListener('click', e => { const b = e.target.closest('button[data-f]'); if (b) buy(b); });
$('ups').addEventListener('click', e => { const b = e.target.closest('button[data-u]'); if (b) buy(b); });
$('hopBtn').addEventListener('click', hop); $('hopSmall').addEventListener('click', hop); $('bangBtn').addEventListener('click', hop);
$('landStay').addEventListener('click', () => { $('land').hidden = true; ui.refresh(); cv.focus(); });
$('landPerks').addEventListener('click', () => openPerks());
$('eatRest').addEventListener('click', eatTheRest);
$('skipBtn').addEventListener('click', trySkip);
$('replayBtn').addEventListener('click', () => { ui.closeSheets(); startCutscene(true); });
$('stayBtn').addEventListener('click', () => { $('win').hidden = true; ui.refresh(); });
const toggleSound = () => { G.prefs.sound = !G.prefs.sound; ui.paintSound(); save(); if (G.prefs.sound) sfx.buy(); };
$('soundBtn').addEventListener('click', toggleSound);
$('setSound').addEventListener('click', toggleSound);
// Start over lives in the settings drawer now, with the same press-twice guard.
$('resetBtn').addEventListener('click', () => {
  if (resetArm <= 0) { resetArm = 4; $('resetBtn').textContent = 'Wipe everything? Click again'; return; }
  resetArm = 0; $('resetBtn').textContent = 'Start over';
  if (G.daily) leaveDaily(true);
  stopCutscene();
  G.state = newState(); G.peek = null; ui.paintPeek(); $('win').hidden = true; $('land').hidden = true; G.ev = null; G.evIn = firstGap(); ui.announce('');
  newRun(G.stats); clearStage(); anim.r = SCENES[0].goop.r0; ui.closeSheets(); ui.buildFeeders(); ui.refresh(); save();
  ui.toast('Fresh petri dish. One gram of goop. Your trophies stay on the shelf.');
});

// trophy shelf and Star Dust
function openShelf() { ui.renderShelf(achievements, scores, identity); ui.openSheet('shelf'); }
function openPerks() { ui.renderPerks(); ui.openSheet('perks'); }
$('shelfBtn').addEventListener('click', openShelf);
$('dustBtn').addEventListener('click', openPerks);
$('winPerks').addEventListener('click', openPerks);
$('perkList').addEventListener('click', e => {
  const b = e.target.closest('button[data-perk]'), m = mainRun();
  if (!b || !buyPerk(m.state, b.dataset.perk)) return;
  m.stats.perksBought++; sfx.buy();
  ui.toast(PERKS.find(p => p.id === b.dataset.perk).name + ': yours for good.');
  ui.renderPerks(); ui.refresh(); save(); badges();
});
for (const id of ui.SHEETS) $(id).addEventListener('click', e => { if (e.target.id === id || e.target.closest('[data-close]')) ui.closeSheets(); });
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && ui.sheetOpen()) { e.preventDefault(); ui.closeSheets(); }
  else if (e.key === 'Escape' && !$('away').hidden) { e.preventDefault(); closeAway(); }
  else if (e.key === 'Escape' && G.cut) { e.preventDefault(); trySkip(); }
});

// export and import
$('exportBtn').addEventListener('click', async () => {
  mainRun().stats.exports++; save();
  const str = exportString(snapshot());
  try { await navigator.clipboard.writeText(str); ui.toast('Save copied. Keep it somewhere safe, or paste it into Load save on another device.'); }
  catch (e) { window.prompt('Copy your save:', str); }
  badges();
});
$('importBtn').addEventListener('click', () => {
  const str = window.prompt('Paste a save you copied earlier. It replaces the goop you have now.');
  if (!str) return;
  try {
    const d = importString(str);
    if (G.daily) leaveDaily(true);
    stopCutscene();
    adopt(d);
    G.peek = null; G.ev = null; G.evIn = firstGap(); G.clickTimes.length = 0; clearStage(); $('win').hidden = true; $('land').hidden = true; $('away').hidden = true; G.away = null; ui.closeSheets();
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

/* ---------- the away card ---------- */
$('burpBtn').addEventListener('click', watchBurp);
$('awayOk').addEventListener('click', closeAway);

/* ---------- the daily goop: its own slot, its own stats, the main goop waiting (and eating) meanwhile ---------- */
let today = platform.daily.todayNow();
platform.daily.today().then(d => { today = d; paintDailyBtn(); });
const dailyBest = date => scores.best('daily', date);
function paintDailyBtn() {
  const best = dailyBest(today.date), b = $('dailyBtn');
  b.textContent = G.daily ? 'Daily goop: on' : best != null ? 'Daily goop: ' + clock(best) : 'Daily goop';
  b.classList.toggle('done', best != null && !G.daily);
}
function dailyRunFor(d) { return G.daily && G.daily.date === d.date ? G.daily : loadDaily(storage, d); }
function openDaily() {
  if (G.cut) return;
  const run = dailyRunFor(today);
  panels.renderDailySheet({ daily: today, run, best: dailyBest(today.date), recent: panels.recentDailies(scores.all()), active: !!G.daily });
  ui.openSheet('dailySheet');
}
// Swap the daily's run onto the stage. The main run waits in G.main; its save keeps the time it was left.
function swapIn(run) {
  G.ev = null; G.peek = null; ui.paintPeek(); clearStage(); ui.announce('');
  $('away').hidden = true; G.away = null;            // callers settle an unclaimed burp first (settleAway)
  $('win').hidden = true; $('land').hidden = true; $('dailyEnd').hidden = true;
  G.state = run.state; G.stats = run.stats; G.clickTimes.length = 0;
  G.clock = { fed: G.stats.playSecs, caught: -99, hopped: -99, back: -99 };
  anim.r = SCENES[G.state.stage].goop.r0;
  ui.buildFeeders(); ui.refresh();
}
function enterDaily(run) {
  if (G.daily) return;
  settleAway(); save();
  G.main = { state: G.state, stats: G.stats, leftAt: Date.now(), clock: { ...G.clock }, evIn: G.evIn };
  G.daily = run; G.rules = rulesOf(run.mutator); G.deck = dailyDeck(EVENTS, run.mutator);
  G.rand = rng((run.seed ^ (run.tries * 0x9e3779b1)) >>> 0);        // same seed for everyone; a new try reshuffles
  swapIn(run); G.evIn = firstGap();
  const m = MUTATOR_BY_ID[run.mutator];
  $('dailyBarName').textContent = 'Daily goop'; $('dailyBarRule').textContent = m.name + ': ' + m.blurb;
  $('dailyBar').hidden = false; document.body.classList.add('in-daily');
  if (run.at && run.done == null) returnFrom(Math.max(0, (Date.now() - run.at) / 1000));
  save(); paintDailyBtn();
  if (run.done != null) showDailyEnd(false);
  else ui.toast('Today\'s twist: ' + m.name + '. Eat the Sun as fast as you can. Your own goop keeps eating.');
}
function leaveDaily(quiet) {
  if (!G.daily) return;
  settleAway();
  G.daily.at = Date.now(); writeDaily(storage, G.daily);
  const back = G.main, away = (Date.now() - back.leftAt) / 1000;
  G.daily = null; G.main = null; G.rules = rulesOf(null); G.deck = EVENTS; G.rand = Math.random;
  swapIn({ state: back.state, stats: back.stats });
  G.clock = back.clock; G.clock.fed = G.stats.playSecs; G.evIn = back.evIn;
  $('dailyBar').hidden = true; document.body.classList.remove('in-daily');
  if (!quiet && away > 0) returnFrom(away);                   // the main goop ate while you were in the daily
  save(); paintDailyBtn(); badges();
}
function finishDaily() {
  const run = G.daily, secs = G.state.played;
  run.done = secs;
  const r = scores.submit('daily', secs, run.date, runClaim(G.state, run.mutator));
  G.main.stats.dailyDone++;
  if (run.mutator === 'hands') flag(G.main.stats, 'dailyHands');
  const dd = dailyWeekMult(G.main.state);                     // Daily Double: a new best counts toward the week
  if (r.improved && dd > 0) { scores.add('week', G.state.life * dd, week); ui.award(['Daily Double: ' + fmt(G.state.life * dd) + ' slop on your weekly total.'], 'Daily Double', 'mile'); }
  G.ev = null; ui.announce('');
  sfx.stage(); buzz(BUZZ.stage);
  save(); paintDailyBtn(); badges();
  showDailyEnd(r.improved);
}
function showDailyEnd(improved) {
  const run = G.daily, m = MUTATOR_BY_ID[run.mutator], best = dailyBest(run.date);
  $('dailyEndAct').textContent = 'Daily goop, ' + run.date + ': ' + m.name;
  $('dailyEndTitle').textContent = 'The Sun is eaten.';
  $('dailyEndText').textContent = 'It took ' + clock(run.done) + ' and ' + fmt(run.stats.feeds) + ' spoonfuls by hand' + (run.tries > 1 ? ', on try ' + run.tries : '') + '.';
  $('dailyEndBest').textContent = (improved ? 'A new best for today. ' : 'Your best today: ' + clock(best) + '. ') + 'Time to beat: ' + clock(best) + ', your own, until online boards arrive.';
  $('dailyEnd').hidden = false; $('dailyHome').focus();
}
function retryToday() {
  const run = retryDaily(dailyRunFor(today));
  if (G.daily) { settleAway(); $('dailyEnd').hidden = true; G.daily = run; G.rand = rng((run.seed ^ (run.tries * 0x9e3779b1)) >>> 0); swapIn(run); G.evIn = firstGap(); save(); ui.toast('Try ' + run.tries + '. Fresh petri dish, same twist.'); }
  else { writeDaily(storage, run); enterDaily(run); }
}
$('dailyBtn').addEventListener('click', openDaily);
$('dailyGo').addEventListener('click', () => { ui.closeSheets(); if (!G.daily) enterDaily(dailyRunFor(today)); });
$('dailyRetry').addEventListener('click', () => { ui.closeSheets(); retryToday(); });
$('dailyLeave').addEventListener('click', () => leaveDaily(false));
$('dailyHome').addEventListener('click', () => { $('dailyEnd').hidden = true; leaveDaily(false); });
$('dailyAgain').addEventListener('click', retryToday);
$('dailyShare').addEventListener('click', async () => {
  const run = G.daily; if (!run) return;
  const txt = 'Feed the Goop daily goop, ' + run.date + ' (' + MUTATOR_BY_ID[run.mutator].name + '): I ate the Sun in ' + clock(run.done) + '. ' + GAME_URL;
  try { await navigator.clipboard.writeText(txt); ui.toast('Result copied. Paste it anywhere.'); } catch (e) { window.prompt('Copy your result:', txt); }
});

/* ---------- settings ---------- */
let pwa = null, installable = false;
function openSettings() {
  panels.renderSettings({ identity, health: saveHealth(storage), installable });
  if ($('settings').hidden) ui.openSheet('settings');
}
$('settingsBtn').addEventListener('click', () => { save(); openSettings(); });
$('setHaptics').addEventListener('click', () => { G.prefs.haptics = !G.prefs.haptics; buzz(BUZZ.catch); save(); openSettings(); });
document.querySelectorAll('[data-numbers]').forEach(b => b.addEventListener('click', () => { G.prefs.numbers = b.dataset.numbers; applyPrefs(); ui.buildFeeders(); ui.refresh(); save(); openSettings(); }));
document.querySelectorAll('[data-motion]').forEach(b => b.addEventListener('click', () => { G.prefs.motion = b.dataset.motion; applyPrefs(); save(); openSettings(); }));
$('installBtn').addEventListener('click', async () => { if (pwa && await pwa.install()) ui.toast('The goop is on your home screen. It is very proud.'); openSettings(); });
$('corruptBtn').addEventListener('click', async () => {
  const str = storage.get(CORRUPT_KEY) || '';
  try { await navigator.clipboard.writeText(str); ui.toast('The damaged save is copied.'); } catch (e) { window.prompt('The damaged save:', str); }
});

/* ---------- the name chooser and personal bests ---------- */
$('setNameBtn').addEventListener('click', () => panels.openNamer(identity));
$('shelfName').addEventListener('click', () => panels.openNamer(identity));
$('bestsNameBtn').addEventListener('click', () => panels.openNamer(identity));
$('shareName').addEventListener('click', () => panels.openNamer(identity));
$('nameForm').addEventListener('submit', async e => {
  e.preventDefault();
  const r = identity.claim ? await identity.claim($('nameInput').value) : identity.setName($('nameInput').value);
  if (!r.ok) { $('nameErr').textContent = r.reason; $('nameInput').focus(); return; }
  save(); ui.closeSheets();
  ui.toast('The goop will call you ' + r.name + '. It may not say it nicely.');
});
function openBests() {
  const m = mainRun();
  panels.renderBests({ identity, scores, mainState: m.state, mainStats: m.stats, keys: { week, daily: today.date } });
  ui.openSheet('bests');
}
$('bestsBtn').addEventListener('click', openBests);

/* ---------- the share card ---------- */
let shareCanvas = null, shareData = null;
async function openShare() {
  const m = mainRun();
  shareData = shareModel({ state: m.state, stats: m.stats, badges: achievements.earned(), name: identity.name() });
  try { await Promise.race([document.fonts.load('400 40px "Lilita One"'), new Promise(r => setTimeout(r, 1200))]); } catch (e) { /* draw with the fallback font */ }
  shareCanvas = drawShareCard(shareData, shareCanvas || undefined);
  $('shareImg').src = shareCanvas.toDataURL('image/png'); $('shareImg').alt = shareData.text;
  $('shareHint').textContent = 'Copy the picture, or share it straight to an app. You can also press and hold (or right-click) it to save it.';
  m.stats.shares++;
  ui.openSheet('share'); save(); badges();
}
$('winShare').addEventListener('click', openShare);
$('landShare').addEventListener('click', openShare);
$('shelfShare').addEventListener('click', openShare);
$('copyImg').addEventListener('click', async () => {
  if (!shareCanvas) return;
  if (await copyCard(shareCanvas)) ui.toast('Picture copied. Paste it into a chat.');
  else $('shareHint').textContent = 'This browser will not copy pictures. Press and hold (or right-click) the picture above to save it.';
});
$('shareBtn').addEventListener('click', async () => {
  if (!shareCanvas) return;
  const r = await shareCard(shareCanvas, shareData);
  if (r === 'link-copied') ui.toast('This browser cannot share pictures, so the link is copied instead.');
  else if (r === 'failed') $('shareHint').textContent = 'Sharing is not available here. Press and hold (or right-click) the picture to save it.';
});

/* ---------- go ---------- */
function start() {
  const { data, from, corrupt } = loadSave(storage);
  if (data) adopt(data); else applyPrefs();
  fit(); ui.paintSound(); ui.buildFeeders(); ui.refresh();
  if (corrupt) ui.award([from === 'shadow' ? 'Your save could not be read, so the goop loaded its backup copy. The damaged one is kept aside in Settings.'
    : from === 'v1' ? 'Your save could not be read and there was no recent backup, so the goop loaded an older copy from before the last big update. The damaged one is kept aside in Settings.'
    : 'Your save could not be read and there was no backup. Fresh petri dish. The damaged one is kept aside in Settings.'], 'Save trouble');
  else if (from === 'shadow' && data.schema >= SAVE_VERSION) ui.award(['An older tab wrote over your save, or it went missing. The goop loaded its backup copy, and nothing was lost.'], 'Save restored');
  anim.r = SCENES[G.state.stage].goop.r0;
  G.clock.fed = G.stats.playSecs;
  if (data && data.schema === 2 && G.state.life >= SUN_AT)          // said first, before any trophies or away news
    ui.award(['The universe turned out to be bigger. Your goop is now on stage ' + (G.state.stage + 1) + ' of ' + STAGES.length + ': ' + STAGES[G.state.stage].name + '. Nothing was lost.'], 'Fourteen new stages');
  const away = data && data.at ? Math.max(0, (Date.now() - data.at) / 1000) : 0;
  if (away > 0) returnFrom(away);
  if (from === 'v1') {
    save();                          // writes the v2 key; the v1 key stays untouched as a backup
    if (G.state.dust > 0) ui.award([G.state.dust + ' Star Dust for your ' + G.stats.hops + ' past hop' + (G.stats.hops > 1 ? 's' : '') + '. Spend it in the shop.'], 'New in the lab');
  }
  if (data && data.schema < SAVE_VERSION) save();   // the current schema, written over the same key, once
  if (G.stats.bigBangs > 0) scores.submit('bigbangs', G.stats.bigBangs);   // the Big Bang board starts from what you already have
  // Closed the tab during the first viewing of the ending: it counts as seen (the replay is skippable),
  // and the landing it never reached comes up now.
  if (interruptedEnding(G.state, G.stats)) { G.stats.cutsceneSeen = 1; save(); ui.showLanding(); }
  if (G.state.ate && canHop(G.state)) $('hopSmall').hidden = false;
  badges();
  paintDailyBtn();
  pwa = initPwa({
    onUpdate: apply => { $('update').hidden = false; $('updateBtn').onclick = () => { save(); $('updateBtn').disabled = true; apply(); }; },
    onInstallable: v => { installable = v; if (!$('settings').hidden) openSettings(); },
  });
  lastNow = performance.now(); requestAnimationFrame(frame);
}
start();

// Development only (stripped from the production build): poke the game from the console or a test.
if (import.meta.env.DEV) window.__goop = {
  G, EVENTS, spawn: id => spawnEvent(EVENTS.find(e => e.id === id)), save, badges,
  // own n of feeder id (celebrated as in play), or play a legend's set piece frozen at t seconds
  own(id, n) { G.state.own[FEEDER_IDS.indexOf(id)] = n; legends(); ui.buildFeeders(); ui.refresh(); },
  piece(id, t = 1.5, frozen = true) { G.piece = { id, t, frozen }; },
  // jump to stage k (0-based) at progress f (0..1), with milestones behind it passed quietly
  jump(k, f = .3, slop) {
    const s = G.state, [a, b] = stageSpan(k), lo = Math.log10(a.at + 1), hi = Math.log10(b.at + 1);
    const life = Math.pow(10, lo + f * (hi - lo)) - 1;
    G.peek = null; ui.paintPeek(); $('win').hidden = true; $('land').hidden = true;
    s.life = 0; s.stage = 0; s.won = false; s.winSeen = life >= SUN_AT; s.ate = false; s.miles = {};
    earn(s, life); s.slop = slop == null ? life * .2 : slop; seedMilestones(s);
    anim.r = SCENES[s.stage].goop.r0; clearStage(); ui.buildFeeders(); ui.refresh(); ui.banner(s.stage);
  },
  // play the ending from time t; frozen holds it there (for screenshots)
  cut(t = 0, frozen = false) { startCutscene(false); G.cut.t = t; G.cut.frozen = frozen; },
  endCut: () => endCutscene(true),
  mood(id, text) { G.mood.force = id || null; G.mood.text = text || ''; G.mood.life = text ? 99 : 0; G.mood.next = 99; },
  eatTheRest, END, STAGES,
  away(secs) { returnFrom(secs); },                       // pretend the tab was away this long
  gain,
  daily: () => G.daily, enterDaily: () => enterDaily(dailyRunFor(today)), leaveDaily: () => leaveDaily(false), today: () => today,
  finishDaily() { const s = G.state; earn(s, Math.max(0, SUN_AT - s.life)); winCheck(); },
  share: openShare, bests: openBests, settings: openSettings, platform, storage,
  scene: k => ({ x: SCENES[k].goop.x, y: anim.cy }),
};

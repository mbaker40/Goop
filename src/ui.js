/* The page around the canvas: HUD, shop, banners, toasts, the win card, the trophy shelf and the Star
   Dust panel. Reads the shared store; actions (buying, hopping) are wired up in main.js. */
import { clamp } from './draw.js';
import { goopColours } from './sprites/goop.js';
import { STAGES, FEEDERS, UPGRADES, feederCost, feederRate, slopPerSec, stageProgress, massGrams, feederOpen, upgradeOpen, boostMult } from './econ.js';
import { PERKS, perkLevel, perkCost, perkMax, dustForRun, clickCap } from './prestige.js';
import { BADGES } from './achievements.js';
import { EVENTS } from './events.js';
import { SUN, totalCaught } from './stats.js';
import { fmt, fmtMass, heavierThan, clock } from './fmt.js';
import { G } from './game.js';

export const $ = id => document.getElementById(id);

/* ---------- toasts: event news shows at once; trophies queue politely behind it ---------- */
let toastT = 0, bannerT = 0;
const awards = [];
export function toast(msg) { const t = $('toast'); t.className = 'over toast'; t.textContent = msg; t.hidden = false; toastT = 4.2; }
export function award(names, head) { awards.push({ names, head }); }
function showAward() {
  const a = awards.shift();
  let names = a.names;
  while (!a.head && awards.length && !awards[0].head && names.length < 3) names = names.concat(awards.shift().names);
  const t = $('toast'); t.className = 'over toast gold'; t.textContent = '';
  const sm = document.createElement('small'); sm.textContent = a.head || (names.length > 1 ? names.length + ' trophies earned' : 'Trophy earned');
  t.append(sm, names.length > 2 ? names.length + ' new things on the shelf. Go and look.' : names.join(' and '));
  t.hidden = false; toastT = 3.4;
}
export function announce(msg) { $('evlive').textContent = msg; }
export function banner(stage) {
  $('bannerSmall').textContent = 'Stage ' + (stage + 1) + ' of ' + STAGES.length;
  $('bannerBig').textContent = STAGES[stage].name;
  const b = $('banner'); b.hidden = true; void b.offsetWidth; b.hidden = false; bannerT = 2.8;
}
export function tickUi(real) {
  if (toastT > 0) { toastT -= real; if (toastT <= 0) $('toast').hidden = true; }
  else if (awards.length && $('toast').hidden) showAward();
  if (bannerT > 0) { bannerT -= real; if (bannerT <= 0) $('banner').hidden = true; }
}

/* ---------- the shop ---------- */
let upSig = '', feedSig = '';
export function buildFeeders() {
  const s = G.state, F = $('feeders'), keep = document.activeElement && document.activeElement.id;
  F.textContent = ''; let teased = false;
  FEEDERS.forEach((f, i) => {
    if (feederOpen(s, i)) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'item feeder'; b.dataset.f = i; b.id = 'feeder-' + f.id;
      b.innerHTML = '<span class="nm"></span><span class="cost"><i class="drop"></i><span class="c"></span></span><span class="own"></span><span class="fx"></span>';
      b.querySelector('.nm').textContent = f.name; b.title = f.blurb; F.appendChild(b);
    } else if (!teased) {
      teased = true; const d = document.createElement('div'); d.className = 'item locked';
      d.innerHTML = '<span class="nm">???</span><br><span class="fx"></span>'; d.querySelector('.fx').textContent = 'Arrives when the goop ' + STAGES[f.stage - 1].goal + '.'; F.appendChild(d);
    }
  });
  feedSig = FEEDERS.map((f, i) => feederOpen(s, i) ? 1 : 0).join('');
  if (keep && $(keep)) $(keep).focus();
  buildUps();
}
const openUps = () => UPGRADES.filter(u => upgradeOpen(G.state, u)).sort((a, b) => a.cost - b.cost);
function buildUps() {
  const U = $('ups'), open = openUps();
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
export function refresh() {
  const s = G.state;
  if (FEEDERS.map((f, i) => feederOpen(s, i) ? 1 : 0).join('') !== feedSig) buildFeeders();
  else if (openUps().map(u => u.id).join(',') !== upSig) buildUps();
  const sps = slopPerSec(s), g = massGrams(s.life), k = s.stage, p = clamp(stageProgress(s.life), 0, 1);
  $('slop').textContent = fmt(Math.floor(s.slop));
  $('sps').textContent = fmt(sps) + ' per second';
  $('mass').textContent = fmtMass(g);
  $('heavier').textContent = heavierThan(g);
  $('stageName').textContent = 'Stage ' + (k + 1) + ' of ' + STAGES.length + ': ' + STAGES[k].name;
  $('stageNext').textContent = s.won ? 'Nothing left in this system. It is still chewing.' : 'Next: ' + STAGES[k].goal + STAGES[k].when;
  $('bar').style.width = (s.won ? 100 : p * 100).toFixed(1) + '%'; $('bar').style.background = goopColours(k, p)[0];
  $('barBox').setAttribute('aria-valuenow', Math.round(s.won ? 100 : p * 100));
  const buff = s.freeze > 0 ? 'Feeders frozen for ' + Math.ceil(s.freeze) + 's' : s.frenzy > 0 ? 'Frenzy x' + boostMult(s) + ' for ' + Math.ceil(s.frenzy) + 's' : '';
  $('buff').hidden = !buff; if (buff) $('buff').textContent = buff;
  $('hint').hidden = s.feeds >= 3 || !$('toast').hidden;
  $('hopSmall').hidden = !(s.won && $('win').hidden);
  $('shelfCount').textContent = G.badgeCount + '/' + BADGES.length;
  $('dustCount').textContent = fmt(s.dust);
  document.querySelectorAll('#feeders button').forEach(b => {
    const i = +b.dataset.f, c = feederCost(s, i);
    b.querySelector('.c').textContent = fmt(c); b.querySelector('.own').textContent = s.own[i];
    b.querySelector('.fx').textContent = '+' + fmt(feederRate(s, i)) + ' slop a second each'; b.disabled = s.slop < c;
  });
  document.querySelectorAll('#ups button').forEach(b => { const u = UPGRADES.find(q => q.id === b.dataset.u); b.disabled = s.slop < u.cost; });
}

/* ---------- winning ---------- */
export function showWin() {
  const s = G.state;
  $('winText').textContent = 'It took ' + clock(s.played) + ' and ' + s.feeds.toLocaleString('en-US') + ' spoonfuls by hand. The goop now weighs ' + fmtMass(massGrams(s.life)) + '.';
  paintWinDust();
  $('win').hidden = false;
}
export function paintWinDust() {
  const d = dustForRun(G.state.life);
  $('winDust').textContent = 'Hopping now earns ' + d + ' Star Dust. Keep feeding and it earns more: every 10x the Sun adds 5.';
}

/* ---------- sheets: the trophy shelf and the Star Dust panel ---------- */
let sheetBack = null;
export function openSheet(id) {
  sheetBack = document.activeElement;
  $(id).hidden = false;
  const c = $(id).querySelector('[data-close]'); if (c) c.focus();
}
export function closeSheets() {
  let was = false;
  for (const id of ['shelf', 'perks']) if (!$(id).hidden) { $(id).hidden = true; was = true; }
  if (was && sheetBack && document.contains(sheetBack)) sheetBack.focus();
  return was;
}
export function sheetOpen() { return !$('shelf').hidden || !$('perks').hidden; }

export function renderShelf(achievements, scores, identity) {
  const st = G.stats, earned = achievements.earned();
  $('shelfTitle').textContent = identity.name() + "'s trophy shelf";
  $('shelfSub').textContent = Object.keys(earned).length + ' of ' + BADGES.length + ' earned. Trophies stay on the shelf when you start over.';
  const B = $('badges'); B.textContent = '';
  for (const b of BADGES) {
    const d = document.createElement('div'); d.className = 'badge' + (earned[b.id] ? '' : ' off');
    const n = document.createElement('b'); n.textContent = b.name;
    const t = document.createElement('span'); t.textContent = b.blurb;
    d.append(n, t); B.appendChild(d);
  }
  const seen = Object.values(st.seen).reduce((a, b) => a + b, 0);
  const sun = scores.best('sun');
  const rows = [
    ['Feeds by hand', fmt(st.feeds)], ['Paid feeds', fmt(st.paidClicks)], ['Too-fast feeds', fmt(st.cappedClicks)],
    ['Events caught', fmt(totalCaught(st)) + ' of ' + fmt(seen)], ['Best catch streak', fmt(st.bestStreak)],
    ['Gambles won / lost', st.gambleWins + ' / ' + st.gambleLosses], ['Visitors shooed / not', st.hazardsTapped + ' / ' + st.hazardsMissed],
    ['Hops', fmt(st.hops)], ['Lifetime slop', fmt(st.lifetimeSlop)], ['Peak slop a second', fmt(st.peakSps)],
    ['Time with the goop', clock(st.playSecs)], ['Fastest Sun', sun != null ? clock(sun) : 'not yet'],
  ];
  for (let k = 1; k < STAGES.length; k++) if (st.bestStageAt[k] != null) rows.push(['Fastest to ' + STAGES[k].name, clock(st.bestStageAt[k])]);
  for (const e of EVENTS) if (st.seen[e.id]) rows.push([e.name + 's caught', (st.caught[e.id] || 0) + ' of ' + st.seen[e.id]]);
  const R = $('records'); R.textContent = '';
  for (const [a, b] of rows) { const w = document.createElement('div'), dt = document.createElement('dt'), dd = document.createElement('dd'); dt.textContent = a; dd.textContent = b; w.append(dt, dd); R.appendChild(w); }
}

export function renderPerks() {
  const s = G.state;
  $('perksTitle').textContent = 'Star Dust: ' + fmt(s.dust);
  $('perksSub').textContent = 'Each hop leaves Star Dust behind. Perks are yours for good and survive every hop. ' +
    (s.won ? 'Hopping now would earn ' + dustForRun(s.life) + ' more.' : 'Eat the Sun, then hop, to earn some.') + ' Hand feeds pay up to ' + clickCap(s) + ' a second.';
  const L = $('perkList'), keep = document.activeElement && document.activeElement.dataset && document.activeElement.dataset.perk;
  L.textContent = '';
  for (const p of PERKS) {
    const lv = perkLevel(s, p.id), max = perkMax(p.id), cost = perkCost(s, p.id);
    const b = document.createElement('button'); b.type = 'button'; b.className = 'item perk' + (lv >= max ? ' maxed' : ''); b.dataset.perk = p.id;
    b.innerHTML = '<span class="nm"></span><span class="cost"></span><span class="fx"></span>';
    b.querySelector('.nm').textContent = p.name;
    const lvl = document.createElement('span'); lvl.className = 'lv'; lvl.textContent = max > 1 ? '  level ' + lv + ' of ' + max : '';
    b.querySelector('.nm').appendChild(lvl);
    const c = b.querySelector('.cost');
    if (lv >= max) c.textContent = 'Owned';
    else { const i = document.createElement('i'); i.className = 'dust'; c.append(i, String(cost)); }
    b.querySelector('.fx').textContent = p.blurb;
    b.disabled = lv >= max || s.dust < cost;
    b.setAttribute('aria-label', p.name + (lv >= max ? ', owned' : ', costs ' + cost + ' Star Dust') + '. ' + p.blurb);
    L.appendChild(b);
  }
  if (keep) { const b = L.querySelector('[data-perk="' + keep + '"]'); if (b && !b.disabled) b.focus(); else $('perks').querySelector('[data-close]').focus(); }
}

/* ---------- small things ---------- */
export function paintSound() { $('soundBtn').textContent = G.prefs.sound ? 'Sound on' : 'Sound off'; $('soundBtn').setAttribute('aria-pressed', G.prefs.sound); }
export function paintPeek() {
  document.querySelectorAll('#peek button').forEach(b => b.setAttribute('aria-pressed', String(G.peek === +b.dataset.k)));
  $('peekchip').hidden = G.peek == null; if (G.peek != null) $('peekchip').textContent = 'Peeking at stage ' + (G.peek + 1) + ': ' + STAGES[G.peek].name;
}
export function buildPeek(onPick) {
  STAGES.forEach((s, k) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'ghost'; b.dataset.k = k; b.textContent = (k + 1) + '. ' + s.name; b.setAttribute('aria-pressed', 'false');
    b.addEventListener('click', () => onPick(k));
    $('peek').appendChild(b);
  });
}
export { SUN };

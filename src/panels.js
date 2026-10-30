/* The phase 3 panels: settings, personal bests, the name chooser, the daily goop sheet and the share
   sheet. DOM only; the rules they show live in save.js, daily.js, share.js and the platform adapters, and
   main.js wires the buttons. */
import { $, openSheet } from './ui.js';
import { G } from './game.js';
import { fmt, clock } from './fmt.js';
import { BOARDS, BOARD_KINDS, keyedRecords } from './platform/scores.js';
import { MUTATOR_BY_ID } from './daily.js';
import { furthestStage } from './share.js';
import { portrait } from './portrait.js';
import { hapticsSupported } from './haptics.js';
import { systemReduce } from './draw.js';

/* ---------- settings ---------- */
const onOff = (el, on) => { el.setAttribute('aria-pressed', String(!!on)); el.textContent = on ? 'On' : 'Off'; };
export function renderSettings({ identity, health, installable }) {
  const p = G.prefs;
  onOff($('setSound'), p.sound);
  const hs = hapticsSupported();
  onOff($('setHaptics'), p.haptics && hs); $('setHaptics').disabled = !hs;
  $('setHapticsNote').textContent = hs ? '' : 'This device or browser cannot buzz.';
  document.querySelectorAll('[data-numbers]').forEach(b => b.setAttribute('aria-checked', String(b.dataset.numbers === p.numbers)));
  document.querySelectorAll('[data-motion]').forEach(b => b.setAttribute('aria-checked', String(b.dataset.motion === p.motion)));
  document.querySelector('[data-motion="system"]').textContent = 'Like my device (' + (systemReduce ? 'less' : 'full') + ')';
  $('setName').textContent = identity.name();
  $('installRow').hidden = !installable;
  $('corruptBtn').hidden = !health.corrupt;
  $('saveHealth').textContent = 'Save schema ' + (health.schema || 'not written yet') + '. Shadow backup: ' + health.shadow +
    (health.shadow === 'in step' ? ' (a second copy that older tabs cannot overwrite).' : health.shadow === 'behind' ? ' (it catches up on the next save).' : ' (written on the next save).') +
    (health.corrupt ? ' A damaged save from earlier is kept aside: copy it if you want to send it in.' : '');
}

/* ---------- personal bests ---------- */
export function paintAvatar(canvas, state, stats) {
  const { stage } = furthestStage(state, stats);
  const dpr = Math.min(window.devicePixelRatio || 1, 2), size = Math.round(64 * dpr);
  canvas.width = canvas.height = size;
  portrait(canvas.getContext('2d'), size, stage, { inset: .8 });
}
const valueText = (unit, v) => (unit === 'time' ? clock(v) : unit === 'slop' ? fmt(v) + ' slop' : fmt(v));
const dateText = key => { try { return new Date(key + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }); } catch (e) { return key; } };
const EMPTY = {
  sun: 'Eat the Sun to set a time.', universe: 'Eat the universe to set a time.', week: 'Feed the goop this week.',
  daily: 'Finish a daily goop to set a time.', bigbangs: 'Become the new universe to start counting.',
};
// One list per board kind. Each list is drawn from a board object ({ title, unit, entries, note, source })
// whatever provider made it, so a server board drops in with no change here.
export function renderBests({ identity, scores, mainState, mainStats, keys }) {
  $('bestsTitle').textContent = 'Personal bests';
  $('bestsName').textContent = identity.name();
  paintAvatar($('avatar'), mainState, mainStats);
  const B = $('boards');
  B.textContent = '';
  const notes = new Set();
  return Promise.all(BOARD_KINDS.map(kind => scores.board(kind, { name: identity.name(), key: keys[kind] }))).then(boards => {
    B.textContent = '';
    boards.forEach((b, i) => {
      const kind = BOARD_KINDS[i], d = document.createElement('section'); d.className = 'board'; d.setAttribute('aria-label', b.title);
      const h = document.createElement('h3'); h.textContent = b.title; d.appendChild(h);
      if (b.note) notes.add(b.note);
      if (!b.entries.length) { const p = document.createElement('p'); p.className = 'empty'; p.textContent = EMPTY[kind] || 'Nothing yet.'; d.appendChild(p); }
      else {
        const ol = document.createElement('ol');
        for (const e of b.entries.slice(0, 10)) {
          const li = document.createElement('li'); if (e.current) li.className = 'current';
          const rk = document.createElement('span'); rk.className = 'rk'; rk.textContent = e.rank + '.';
          const who = document.createElement('span'); who.className = 'who';
          who.textContent = BOARDS[kind].keyed ? (kind === 'week' ? 'Week of ' : '') + dateText(e.label) + (e.current ? (kind === 'week' ? ' (this week)' : ' (today)') : '') : e.name + (e.label ? ', ' + e.label : '');
          const val = document.createElement('span'); val.className = 'val'; val.textContent = valueText(b.unit, e.value);
          li.append(rk, who, val); ol.appendChild(li);
        }
        d.appendChild(ol);
      }
      B.appendChild(d);
    });
    $('bestsNote').textContent = [...notes].join(' ');
  });
}

/* ---------- the name chooser ---------- */
export function openNamer(identity) {
  $('nameInput').value = identity.hasName() ? identity.name() : '';
  $('nameErr').textContent = '';
  openSheet('namer');
  $('nameInput').focus();
}

/* ---------- the daily goop sheet ---------- */
export function renderDailySheet({ daily, run, best, recent, active }) {
  const m = MUTATOR_BY_ID[daily.mutator];
  $('dailyDate').textContent = 'Today, ' + dateText(daily.date) + ' (UTC). Same seed and twist for everyone' + (daily.source === 'cloud' ? '.' : ', worked out on this device.');
  $('dailyMut').textContent = m.name; $('dailyMutBlurb').textContent = m.blurb;
  const R = $('dailyStats'); R.textContent = '';
  const rows = [['Your best today', best != null ? clock(best) : 'not yet'], ['Time to beat', best != null ? clock(best) + ' (yours, until online boards arrive)' : 'set one'], ['Tries today', String(run ? run.tries : 0)]];
  if (run && run.done == null && run.state.life > 0) rows.push(['This try so far', clock(run.state.played) + ', stage ' + (run.state.stage + 1)]);
  for (const [a, b] of rows) { const w = document.createElement('div'), dt = document.createElement('dt'), dd = document.createElement('dd'); dt.textContent = a; dd.textContent = b; w.append(dt, dd); R.appendChild(w); }
  $('dailyGo').textContent = active ? 'Back to today\'s goop' : run && run.done != null ? 'See today\'s result' : run && run.state.life > 0 ? 'Carry on with today\'s goop' : 'Start today\'s goop';
  $('dailyRetry').hidden = !(run && (run.done != null || run.state.life > 0));
  const D = $('dailyRecent'); D.textContent = '';
  if (!recent.length) { const w = document.createElement('div'), dt = document.createElement('dt'); dt.textContent = 'No daily goops finished yet.'; w.appendChild(dt); D.appendChild(w); }
  for (const [key, v] of recent.slice(0, 7)) { const w = document.createElement('div'), dt = document.createElement('dt'), dd = document.createElement('dd'); dt.textContent = dateText(key) + (key === daily.date ? ' (today)' : ''); dd.textContent = clock(v); w.append(dt, dd); D.appendChild(w); }
}
export const recentDailies = bests => keyedRecords(bests, 'daily');

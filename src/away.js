/* The offline-return ritual: what the goop ate while you were gone, a joke from wherever it is, and one
   tap to watch it burp, which doubles the away pay, once per return. Pure, no DOM: main.js shows the card
   and plays the burp. */
import { OFFLINE_GRACE } from './econ.js';

// One joke list per group of stages, in the voice of the milestones. Each says what went missing.
export const AWAY_GROUPS = [
  { to: 1, lines: [                       // the lab table and the lab
    'It ate the stapler, two lab coats and the sticky note that said DO NOT FEED.',
    'The intern says it was like that when they got here. The intern is lying.',
    'It ate your lunch. The yoghurt with your name on it. It read the name first.',
  ] },
  { to: 3, lines: [                       // downtown and the Earth
    'It ate a car park, a parade, and most of a Tuesday.',
    'Three ferries are missing. The goop has a ferry-shaped bulge.',
    'It ate the weather. Nobody has been able to complain about it since.',
  ] },
  { to: 6, lines: [                       // planets, the Sun, the neighbours
    'It licked Saturn\'s rings like a lollipop and put the stick back.',
    'Several comets have been reported missing. The goop is humming innocently.',
    'It ate a star and left the crusts.',
  ] },
  { to: 10, lines: [                      // nebulae, the black hole, the galaxy, Andromeda
    'It ate a nebula. It says the baby stars were for later.',
    'The black hole asked for its event horizon back. The goop burped at it.',
    'A spiral arm is missing. The goop has a spiral-arm-shaped smile.',
  ] },
  { to: 14, lines: [                      // the Local Group to the cosmic web
    'It ate the potluck, the potluck table, and the people who brought the potato salad.',
    'Forty galaxy clusters are unaccounted for. The goop is picking its teeth.',
    'It slurped a filament of the cosmic web like a noodle. It did not share.',
  ] },
  { to: 19, lines: [                      // the nothing, the horizon, the dark menu, the Fourth Wall
    'It ate some nothing. It was mostly air. There was no air.',
    'It ate the edge of the map and then the map. The legend is in there somewhere.',
    'It ate a little of the interface while you were gone. Check your buttons.',
  ] },
];
export function awayGroup(stage) { return AWAY_GROUPS.findIndex(g => stage <= g.to); }
export function awayJoke(stage, rand = Math.random) {
  const g = AWAY_GROUPS[Math.max(0, awayGroup(stage))] || AWAY_GROUPS[AWAY_GROUPS.length - 1];
  return g.lines[Math.floor(rand() * g.lines.length) % g.lines.length];
}

// The card for one return, or null when there is nothing to show: away for a minute or less (a short
// stall is paid quietly), or nothing earned.
export function awayReport(secs, n, stage, rand = Math.random) {
  if (!(secs > OFFLINE_GRACE) || !(n > 0)) return null;
  return { secs, n, stage, joke: awayJoke(stage, rand), burped: false };
}
// Watch the goop burp: pays the away pay again, once. Returns the slop to add (0 the second time).
export function burpBonus(report) {
  if (!report || report.burped) return 0;
  report.burped = true;
  return report.n;
}
// "2 h 13 min", "4 min", "1 day 3 h": how long you were gone, roughly.
export function awayFor(secs) {
  const m = Math.round(secs / 60);
  if (m < 60) return Math.max(1, m) + ' min';
  const h = Math.floor(m / 60);
  if (h < 24) return h + ' h' + (m % 60 ? ' ' + (m % 60) + ' min' : '');
  const d = Math.floor(h / 24);
  return d + ' day' + (d > 1 ? 's' : '') + (h % 24 ? ' ' + (h % 24) + ' h' : '');
}

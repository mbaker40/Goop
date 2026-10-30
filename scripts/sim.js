// npm run sim: time to eat the Sun for a greedy buyer, with and without events, old deck vs new.
import { compare } from '../src/sim.js';
import { EVENTS, LEGACY_DECK, deckEV, incomeBoost } from '../src/events.js';

const SEEDS = 24;
const pct = x => (x >= 0 ? '+' : '') + (x * 100).toFixed(0) + '%';
console.log(`Feed the Goop balance simulation (greedy minimum-payback buyer, 1 s steps, ${SEEDS} seeds each)\n`);
console.log('Analytic value of always collecting one event (seconds of feeder income) and the income boost:');
for (let k = 0; k < 6; k++) console.log(`  stage ${k + 1}: old deck ${deckEV(LEGACY_DECK, k).toFixed(1)} s ${pct(incomeBoost(LEGACY_DECK, k))}   new deck ${deckEV(EVENTS, k).toFixed(1)} s ${pct(incomeBoost(EVENTS, k))}`);
for (const cps of [1, 5]) {
  console.log(`\nClicking ${cps} time${cps > 1 ? 's' : ''} a second:`);
  const none = compare({ deck: null, clicksPerSec: cps }, SEEDS), old = compare({ deck: LEGACY_DECK, clicksPerSec: cps }, SEEDS), now = compare({ deck: EVENTS, clicksPerSec: cps }, SEEDS);
  console.log(`  no events       ${none.minutes.toFixed(1)} min to the Sun`);
  console.log(`  old 50/50 vial  ${old.minutes.toFixed(1)} min   ${old.perEvent.toFixed(1)} s per event   income ${pct(old.boost)}`);
  console.log(`  new event deck  ${now.minutes.toFixed(1)} min   ${now.perEvent.toFixed(1)} s per event   income ${pct(now.boost)}`);
  console.log(`  new vs old event income: ${pct(now.boost / old.boost - 1)} (target within +/-25%)`);
  console.log('  per type (caught, average s): ' + Object.entries(now.byType).map(([id, b]) => `${id} ${b.n}/${(b.secs / b.n).toFixed(0)}`).join(', '));
}

// npm run sim: time to eat the Sun for a greedy buyer, with and without events, old deck vs new; the
// hop strategies from a fresh save to the end of the universe; then the Act 2 pacing table.
import { compare, pacingTable, formatPacing, FIRST_RUN_HOURS, strategyTable, STRATEGIES, stageTimes, maxedRun, simulate, hm } from '../src/sim.js';
import { EVENTS, PHASE3_DECK, LEGACY_DECK, deckEV, incomeBoost } from '../src/events.js';
import { END } from '../src/econ.js';

const SEEDS = 24;
const pct = x => (x >= 0 ? '+' : '') + (x * 100).toFixed(0) + '%';
console.log(`Feed the Goop balance simulation (greedy minimum-payback buyer, 1 s steps)\n`);
console.log('Analytic value of always collecting one event (seconds of feeder income) and the income boost:');
for (const k of [0, 1, 2, 5, 6, 10, 19]) console.log(`  stage ${k + 1}: first vial ${deckEV(LEGACY_DECK, k).toFixed(1)} s   phase 3 deck ${deckEV(PHASE3_DECK, k).toFixed(1)} s ${pct(incomeBoost(PHASE3_DECK, k))}   phase 4 deck ${deckEV(EVENTS, k).toFixed(1)} s ${pct(incomeBoost(EVENTS, k))}   (${pct(deckEV(EVENTS, k) / deckEV(PHASE3_DECK, k) - 1)})`);
for (const cps of [1, 5]) {
  console.log(`\nClicking ${cps} time${cps > 1 ? 's' : ''} a second, to the Sun (milestone bonuses included, ${SEEDS} seeds):`);
  const none = compare({ deck: null, clicksPerSec: cps }, SEEDS), old = compare({ deck: PHASE3_DECK, clicksPerSec: cps }, SEEDS), now = compare({ deck: EVENTS, clicksPerSec: cps }, SEEDS);
  console.log(`  no events       ${none.minutes.toFixed(1)} min to the Sun`);
  console.log(`  phase 3 deck    ${old.minutes.toFixed(1)} min   ${old.perEvent.toFixed(1)} s per event   income ${pct(old.boost)}`);
  console.log(`  phase 4 deck    ${now.minutes.toFixed(1)} min   ${now.perEvent.toFixed(1)} s per event   income ${pct(now.boost)}   (${pct(now.boost / old.boost - 1)}, target within +/-25%)`);
  console.log('  per type (caught, average s): ' + Object.entries(now.byType).map(([id, b]) => `${id} ${b.n}/${(b.secs / b.n).toFixed(0)}`).join(', '));
}
console.log('\nEvent income from the Sun to the end of the universe (a maxed run, 3 seeds):');
for (const cps of [1, 5]) {
  const run = deck => { let ev = 0, t = 0; for (let i = 0; i < 3; i++) { const r = simulate({ deck, clicksPerSec: cps, until: END.at, state: maxedRun(), seed: 50 + i, maxSecs: 8 * 3600 }); for (const v of Object.values(r.byType)) ev += v.secs; t += r.secs; } return { boost: ev / t, secs: t / 3 }; };
  const o = run(PHASE3_DECK), n = run(EVENTS);
  console.log(`  ${cps} click/s: phase 3 deck ${pct(o.boost)} (${hm(o.secs)}), phase 4 deck ${pct(n.boost)} (${hm(n.secs)}), ${pct(n.boost / o.boost - 1)}`);
}
const nofirst = compare({ deck: EVENTS, clicksPerSec: 1, milestones: false }, SEEDS).minutes;
console.log(`\n(Without milestone bonuses a first run reaches the Sun in ${nofirst.toFixed(1)} min at 1 click a second.)`);

console.log('\nHop strategies from a fresh save to the end of the universe, 5 clicks a second, 2 seeds:');
console.log('| Strategy | Hopping | Total | Hop bonus at the end | Old flat +50% rule (same deck and perks) |\n|---|---|---|---|---|');
const flat = Object.fromEntries(strategyTable({ cps: 5, seeds: 2, flat: true }).map(r => [r.id, r]));
for (const r of strategyTable({ cps: 5, seeds: 2 })) console.log(`| ${r.name} | ${hm(r.hopSecs)} | ${hm(r.total)} | +${Math.round(r.bonus * 100)}% | ${hm(flat[r.id].total)} (+${Math.round(flat[r.id].bonus * 100)}%) |`);
const at = STRATEGIES.find(s => s.id === 'mixed').hopAt;
const [plain, stack] = strategyTable({ cps: 5, seeds: 2, list: [{ id: 'm', name: 'm', hopAt: at }, { id: 's', name: 's', hopAt: at, stack: { i: 1, to: 500 } }] });
console.log(`\nFeeder legends: the mixed strategy ${hm(plain.total)}; the same while stacking interns to 500 ${hm(stack.total)}.`);
for (const cps of [1, 5]) console.log(`Maxed run (every perk, 3 Big Bangs and 2 hops from stage 12) to the end at ${cps} click${cps > 1 ? 's' : ''}/s: ${hm(stageTimes({ clicksPerSec: cps, maxSecs: 12 * 3600, makeState: () => maxedRun() }, 3).end)}`);

console.log(`\nAct 2 pacing at 1 click a second, events on, 4 seeds (first run capped at ${FIRST_RUN_HOURS} h of play):\n`);
console.log(formatPacing(pacingTable(4)));

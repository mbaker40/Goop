/**
 * prestigePath.ts — simulates the PATH from a fresh account to the first win: run after run of
 * ClickerBot play, banking GE and greedily buying the cheapest affordable meta upgrade between
 * runs. This validates PLAN §1/§4's promise ("first win … on a second-or-third prestige") as an
 * actual economy property instead of assuming a hand-picked MEDIAN_META fixture.
 */

import { createMetaState } from '../src/sim/game';
import { bankRun, canBuyMeta, buyMeta, metaUpgradeCost } from '../src/sim/prestige';
import { META_UPGRADES } from '../src/config/upgrades';
import { runSimulation } from './core';
import { ClickerBot } from './strategies';

export interface PrestigePathResult {
  runsToWin: number;
  totalMinutes: number;
  geSpent: number;
  runs: { minutes: number; zone: number; ge: number; won: boolean }[];
}

/** Play up to `maxRuns` prestiges; returns how the road to the first win actually looks. */
export function simulatePrestigePath(maxRuns = 40): PrestigePathResult {
  const meta = createMetaState();
  const runs: PrestigePathResult['runs'] = [];
  let totalMinutes = 0;
  let geSpent = 0;

  for (let i = 0; i < maxRuns; i++) {
    const r = runSimulation(ClickerBot, { metaLevels: meta.metaLevels, seed: 1000 + i, maxSeconds: 75 * 60 });
    bankRun(meta, r.peakHeightRaw, r.won);
    totalMinutes += r.runTimeSec / 60;
    runs.push({ minutes: r.runTimeSec / 60, zone: r.peakZone, ge: r.ge, won: r.won });
    if (r.won) return { runsToWin: i + 1, totalMinutes, geSpent, runs };
    // Between runs: buy cheapest affordable meta upgrades (a plausible new player).
    for (;;) {
      let cheapest: string | null = null;
      let cheapestCost = Infinity;
      for (const m of META_UPGRADES) {
        const lvl = meta.metaLevels[m.id] ?? 0;
        if (lvl >= m.maxLevel) continue;
        const c = metaUpgradeCost(m, lvl);
        if (c < cheapestCost) {
          cheapest = m.id;
          cheapestCost = c;
        }
      }
      if (!cheapest || !canBuyMeta(meta, cheapest)) break;
      buyMeta(meta, cheapest);
      geSpent += cheapestCost;
    }
  }
  return { runsToWin: -1, totalMinutes, geSpent, runs };
}

// Standalone: `npx tsx sim-harness/prestigePath.ts`
const argv = (globalThis as { process?: { argv?: string[] } }).process?.argv ?? [];
if (argv[1]?.endsWith('prestigePath.ts')) {
  const r = simulatePrestigePath();
  // eslint-disable-next-line no-console
  console.log('run | min  | zone | GE   | won');
  r.runs.forEach((x, i) => {
    // eslint-disable-next-line no-console
    console.log(`${String(i + 1).padStart(3)} | ${x.minutes.toFixed(1).padStart(4)} | Z${x.zone}   | ${String(x.ge).padStart(4)} | ${x.won ? 'WIN 🏆' : ''}`);
  });
  // eslint-disable-next-line no-console
  console.log(`\nFirst win: run #${r.runsToWin}, cumulative ${r.totalMinutes.toFixed(0)} min, ${r.geSpent} GE spent on meta`);
}

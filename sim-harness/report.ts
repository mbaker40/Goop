/**
 * report.ts — `npm run sim`. Runs every bot and prints the balance table (PLAN §14).
 * Paste the output into docs/balance-notes.md after any balance-affecting change.
 */

import { runSimulation, type SimResult } from './core';
import { GreedyBot, ClickerBot, IdleBot, ChaoticBot, MEDIAN_META } from './strategies';
import { formatTime, formatHeight } from '../src/sim/numbers';
import { displayMeters } from '../src/config/zones';

interface Row {
  label: string;
  result: SimResult;
  metaNote: string;
}

function row(label: string, result: SimResult, metaNote: string): Row {
  return { label, result, metaNote };
}

function main(): void {
  const rows: Row[] = [
    row('GreedyBot (no meta)', runSimulation(GreedyBot, { metaLevels: {} }), 'first-run'),
    row('IdleBot (no meta)', runSimulation(IdleBot, { metaLevels: {} }), 'AFK baseline'),
    row('ChaoticBot (no meta)', runSimulation(ChaoticBot, { metaLevels: {} }), 'distracted'),
    row('ClickerBot (no meta)', runSimulation(ClickerBot, { metaLevels: {} }), 'first-run active'),
    row('ClickerBot (median meta)', runSimulation(ClickerBot, { metaLevels: MEDIAN_META }), 'target win'),
    row('GreedyBot (median meta)', runSimulation(GreedyBot, { metaLevels: MEDIAN_META }), 'passive w/ meta'),
  ];

  const header = ['Scenario', 'Outcome', 'Zone', 'Height', 'Time', 'GE', 'log10 G', 'log10 GPS', 'Note'];
  const table = rows.map((r) => {
    const res = r.result;
    const outcome = res.won ? 'WIN 🏆' : res.status.toUpperCase();
    return [
      r.label,
      outcome,
      `Z${res.peakZone}`,
      formatHeight(displayMeters(res.peakHeightRaw)),
      formatTime(res.runTimeSec),
      String(res.ge),
      res.lifetimeLog10.toFixed(1),
      res.gpsLog10.toFixed(1),
      r.metaNote,
    ];
  });

  printTable(header, table);

  // eslint-disable-next-line no-console
  console.log('\nAcceptance targets (PLAN §14): win 45-60min | greedy no-meta melt Z3-5 @15-30min | idle melt <5min');
}

function printTable(header: string[], rows: string[][]): void {
  const widths = header.map((h, i) => Math.max(h.length, ...rows.map((r) => (r[i] ?? '').length)));
  const fmt = (cells: string[]) => cells.map((c, i) => c.padEnd(widths[i] ?? 0)).join('  ');
  // eslint-disable-next-line no-console
  console.log('\n' + fmt(header));
  // eslint-disable-next-line no-console
  console.log(widths.map((w) => '-'.repeat(w)).join('  '));
  for (const r of rows) {
    // eslint-disable-next-line no-console
    console.log(fmt(r));
  }
}

main();

/**
 * trajectory.ts — `npx tsx sim-harness/trajectory.ts [minutes]`. Dumps a minute-by-minute growth
 * trajectory for ClickerBot (median meta) and GreedyBot (no meta), IGNORING the win threshold, so
 * zone thresholds / WIN_HEIGHT can be placed against measured growth instead of eyeballs
 * (docs/decisions/0001 calibration method, now reproducible).
 */

import { balance } from '../src/config/balance';
import { Game, createMetaState } from '../src/sim/game';
import { PRODUCERS } from '../src/config/producers';
import { ClickerBot, GreedyBot, MEDIAN_META } from './strategies';
import type { Bot } from './core';

// (No @types/node in this project — reach process via globalThis for the CLI arg.)
const argv = (globalThis as { process?: { argv?: string[] } }).process?.argv ?? [];
const minutes = Number(argv[2] ?? 70);

function trace(bot: Bot, metaLevels: Record<string, number>, label: string): void {
  const meta = createMetaState();
  meta.metaLevels = { ...metaLevels };
  const game = new Game(meta, 12345);
  const dt = 1 / balance.tickHz;
  const maxTicks = Math.ceil((minutes * 60) / dt);
  // eslint-disable-next-line no-console
  console.log(`\n== ${label} ==`);
  // eslint-disable-next-line no-console
  console.log('min | height | log10G | log10GPS | owned (per producer)');
  for (let tick = 0; tick < maxTicks; tick++) {
    bot.act(game, dt, tick);
    game.tick(dt);
    if (game.run.status === 'won') game.run.status = 'active'; // ignore win; keep measuring
    if (game.run.status === 'collapsing' || game.run.status === 'dead') {
      // eslint-disable-next-line no-console
      console.log(`DIED at ${(game.run.runTime / 60).toFixed(1)} min, height ${game.heightRaw().toFixed(1)}`);
      break;
    }
    if (tick % (60 * balance.tickHz) === 0) {
      const owned = PRODUCERS.map((p) => game.run.producersOwned[p.id] ?? 0).join(',');
      // eslint-disable-next-line no-console
      console.log(
        `${String(Math.round(game.run.runTime / 60)).padStart(3)} | ${game.heightRaw().toFixed(1).padStart(6)} | ` +
          `${game.run.lifetimeGoop.add(1).log10().toFixed(2).padStart(6)} | ${game.gps().add(1).log10().toFixed(2).padStart(8)} | ${owned}`,
      );
    }
  }
}

trace(ClickerBot, MEDIAN_META, 'ClickerBot (median meta)');
trace(GreedyBot, {}, 'GreedyBot (no meta)');

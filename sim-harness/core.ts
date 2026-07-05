/**
 * core.ts — headless balance simulator (PLAN §14). Drives the PURE sim (src/sim)
 * with bot strategies at high speed and reports run-length / fail-point tables.
 * This is the tool that tunes src/config/balance.ts — build it in M0, keep it green.
 */

import { balance } from '../src/config/balance';
import { PRODUCERS } from '../src/config/producers';
import { Game, createMetaState, type MetaState, type RunStatus } from '../src/sim/game';
import { geEarned } from '../src/sim/prestige';
import { zoneForHeight } from '../src/config/zones';

export interface Bot {
  name: string;
  /** Called every tick. `tick` is the integer tick index. */
  act(game: Game, dt: number, tick: number): void;
}

export interface SimResult {
  bot: string;
  won: boolean;
  status: RunStatus;
  peakHeightRaw: number;
  peakZone: number;
  runTimeSec: number;
  ge: number;
  producersBought: number;
  /** log10 of lifetime goop at end — diagnostic for tuning height/zones. */
  lifetimeLog10: number;
  /** log10 of final GPS at end — diagnostic. */
  gpsLog10: number;
}

export interface SimOptions {
  metaLevels?: Record<string, number>;
  seed?: number;
  maxSeconds?: number;
}

export function runSimulation(bot: Bot, opts: SimOptions = {}): SimResult {
  const meta: MetaState = createMetaState();
  if (opts.metaLevels) meta.metaLevels = { ...opts.metaLevels };
  const seed = opts.seed ?? 12345;
  const maxSeconds = opts.maxSeconds ?? 90 * 60;
  const dt = 1 / balance.tickHz;
  const maxTicks = Math.ceil(maxSeconds / dt);

  const game = new Game(meta, seed);

  let tick = 0;
  for (; tick < maxTicks; tick++) {
    bot.act(game, dt, tick);
    game.tick(dt);
    if (game.run.status === 'won' || game.run.status === 'dead') break;
    // Treat 'collapsing' as terminal for reporting speed (outcome is decided).
    if (game.run.status === 'collapsing') break;
  }

  const peak = game.run.peakHeightRaw;
  const won = game.run.status === 'won';
  let producersBought = 0;
  for (const p of PRODUCERS) producersBought += game.run.producersOwned[p.id] ?? 0;

  return {
    bot: bot.name,
    won,
    status: game.run.status,
    peakHeightRaw: peak,
    peakZone: zoneForHeight(peak).index,
    runTimeSec: game.run.runTime,
    ge: geEarned(peak, won, meta),
    producersBought,
    lifetimeLog10: game.run.lifetimeGoop.add(1).log10(),
    gpsLog10: game.gps().add(1).log10(),
  };
}

// ---- Shared "greedy purchase" logic used by several bots ----

interface BuyAction {
  ratio: number; // added GPS per goop spent
  apply: () => boolean;
}

/** Best affordable GPS-per-cost purchase right now (producer, tier, or global-GPS upgrade). */
export function bestGpsBuy(game: Game): BuyAction | null {
  const globalMult = game.globalGpsMult();
  const currentGps = game.gps().toNumber();
  let best: BuyAction | null = null;

  const consider = (addedGps: number, costD: { toNumber: () => number }, apply: () => boolean) => {
    const cost = costD.toNumber();
    if (!Number.isFinite(cost) || cost <= 0 || addedGps <= 0) return;
    if (!game.canAfford(costAsDecimal(cost))) return;
    const ratio = addedGps / cost;
    if (!best || ratio > best.ratio) best = { ratio, apply };
  };

  for (const p of PRODUCERS) {
    const owned = game.run.producersOwned[p.id] ?? 0;
    const tierMult = tierMultFor(game, p.id);
    const added = p.baseGps * tierMult * globalMult;
    consider(added, game.producerCost(p.id, 1), () => game.buyProducer(p.id, 1));
    void owned;
  }

  for (const u of game.availableTierUpgrades()) {
    const owned = game.run.producersOwned[u.producerId] ?? 0;
    const def = PRODUCERS.find((p) => p.id === u.producerId)!;
    const contribution = owned * def.baseGps * tierMultFor(game, u.producerId) * globalMult;
    consider(contribution, { toNumber: () => u.costGoop }, () => game.buyTierUpgrade(u.id));
  }

  for (const u of game.availableRunUpgrades()) {
    if (u.effect.kind === 'globalGps') {
      const added = currentGps * (u.effect.mult - 1);
      consider(added, { toNumber: () => u.costGoop }, () => game.buyRunUpgrade(u.id));
    }
  }

  return best;
}

function tierMultFor(game: Game, producerId: string): number {
  let c = 0;
  for (const id of game.run.tierUpgrades) {
    if (id.startsWith(producerId + '_tier')) c++;
  }
  return Math.pow(2, c);
}

// Tiny local Decimal shim to avoid importing the class here just for comparisons.
import { D } from '../src/sim/numbers';
function costAsDecimal(n: number) {
  return D(n);
}

/** Buy greedily until nothing affordable improves GPS (bounded to avoid infinite loops). */
export function greedyBuy(game: Game, maxBuys = 500): number {
  let count = 0;
  for (let i = 0; i < maxBuys; i++) {
    const action = bestGpsBuy(game);
    if (!action) break;
    if (!action.apply()) break;
    count++;
  }
  return count;
}

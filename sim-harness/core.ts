/**
 * core.ts - headless balance simulator (PLAN §14). Drives the PURE sim (src/sim)
 * with bot strategies at high speed and reports run-length / fail-point tables.
 * This is the tool that tunes src/config/balance.ts - build it in M0, keep it green.
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
  /** log10 of lifetime goop at end - diagnostic for tuning height/zones. */
  lifetimeLog10: number;
  /** log10 of final GPS at end - diagnostic. */
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
  cost: number;
  affordable: boolean;
  apply: () => boolean;
}

/** How long a sensible player will save toward a big-ticket item, in seconds of current income.
 *  Without saving, greedy play grinds 80 drippers while the Reactor (≈70s of income) sits
 *  unbought forever - the late producer ladder becomes unreachable (the M2 progression bug). */
const SAVE_HORIZON_SEC = 300;

export interface BuyPlan {
  /** Best ratio within the save horizon - possibly unaffordable (the savings target). */
  best: BuyAction | null;
  /** Best ratio among currently AFFORDABLE items (what to nibble on while saving). */
  bestAffordable: BuyAction | null;
}

/** Best GPS-per-cost purchases within the save horizon (producer, tier, or global-GPS upgrade). */
export function bestGpsBuy(game: Game): BuyPlan {
  const globalMult = game.globalGpsMult();
  const currentGps = game.gps().toNumber();
  const horizon = Math.max(1_000, currentGps * SAVE_HORIZON_SEC);
  let best: BuyAction | null = null;
  let bestAffordable: BuyAction | null = null;

  const consider = (addedGps: number, costD: { toNumber: () => number }, apply: () => boolean) => {
    const cost = costD.toNumber();
    if (!Number.isFinite(cost) || cost <= 0 || addedGps <= 0) return;
    if (cost > horizon) return; // beyond a reasonable savings target
    const ratio = addedGps / cost;
    const affordable = game.canAfford(costAsDecimal(cost));
    if (!best || ratio > best.ratio) best = { ratio, cost, affordable, apply };
    if (affordable && (!bestAffordable || ratio > bestAffordable.ratio)) {
      bestAffordable = { ratio, cost, affordable, apply };
    }
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

  return { best, bestAffordable };
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

/** Buy greedily. When the best target isn't affordable yet, SAVE toward it - but keep nibbling on
 *  affordable items whose ratio is still decent (≥30% of the target's), like a real player does.
 *  Never stall income entirely: melt punishes flat GPS (PLAN §5.3), saving included. */
export function greedyBuy(game: Game, maxBuys = 500): number {
  let count = 0;
  for (let i = 0; i < maxBuys; i++) {
    const { best, bestAffordable } = bestGpsBuy(game);
    if (!best) break;
    const pick = best.affordable ? best : bestAffordable && bestAffordable.ratio >= best.ratio * 0.15 ? bestAffordable : null;
    if (!pick) break; // full-save mode: target is close and nothing cheap is worth it
    if (!pick.apply()) break;
    count++;
  }
  return count;
}

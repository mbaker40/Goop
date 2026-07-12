/**
 * strategies.ts - bot players for the balance harness (PLAN §14).
 * GreedyBot (buys best GPS/cost, no clicking), IdleBot (buys rarely, never clicks),
 * ClickerBot (max active play), ChaoticBot (random purchases, misses events).
 */

import { balance } from '../src/config/balance';
import type { Game } from '../src/sim/game';
import { Rng } from '../src/sim/rng';
import { PRODUCERS } from '../src/config/producers';
import { type Bot, greedyBuy } from './core';

const tickHz = balance.tickHz;

/** "Median" meta loadout approximating a 2nd-3rd prestige (PLAN §14.1 win target). */
export const MEDIAN_META: Record<string, number> = {
  gpsBoost: 8,
  clickPow: 6,
  meltResist: 4,
  comboDur: 3,
  starterDrippers: 3,
  geGain: 3,
};

/** Optimizing player: clicks actively and buys the best GPS/cost purchase, but buys NO
 *  quality-of-life upgrades (slap/grease/coolant). The "solid run" - with no meta it hits a
 *  growth wall and melts mid-zones; that's the intended first-run experience (PLAN §14.2). */
export const GreedyBot: Bot = {
  name: 'GreedyBot',
  act(game, _dt, tick) {
    game.click();
    if (tick % Math.round(tickHz / 2) === 0) greedyBuy(game);
  },
};

/** Max active play: clicks every tick AND buys greedily, plus quality-of-life upgrades.
 *  Handles chaos events like an attentive player: clears targets, declines risky deals. */
export const ClickerBot: Bot = {
  name: 'ClickerBot',
  act(game, _dt, tick) {
    game.click(); // ~tickHz clicks/sec
    game.tapEventTarget(); // one target per tick ≈ a focused tap-spree
    if (tick % Math.round(tickHz / 2) === 0) {
      greedyBuy(game);
      buyQoL(game);
      game.answerEvent(false); // no deals; melt is scary enough
    }
  },
};

/** Establishes a tower, then goes fully AFK - tests "stall => melt within ~5 min" (PLAN §14.3).
 *  (A never-touched game with zero income has nothing to melt; the meaningful test is a player
 *  who builds something and then stops paying attention.) */
export const IDLE_WARMUP_SEC = 180;
export const IdleBot: Bot = {
  name: 'IdleBot',
  act(game, _dt, tick) {
    if (game.run.runTime < IDLE_WARMUP_SEC) {
      game.click();
      if (tick % Math.round(tickHz / 2) === 0) greedyBuy(game);
    }
    // After warmup: nothing. No clicks, no buys. Melt should overtake within minutes.
  },
};

/** Random purchases + random clicks; representative of a distracted player. */
export function makeChaoticBot(seed = 999): Bot {
  const rng = new Rng(seed);
  return {
    name: 'ChaoticBot',
    act(game, _dt, tick) {
      if (rng.chance(0.4)) game.click();
      // Sometimes notices event targets; sometimes takes the deal. Chaos befits chaos.
      if (rng.chance(0.3)) game.tapEventTarget();
      if (rng.chance(0.01)) game.answerEvent(rng.chance(0.5));
      if (tick % Math.round(tickHz / 2) === 0 && rng.chance(0.5)) {
        // Buy a random affordable producer.
        const shuffled = [...PRODUCERS].sort(() => rng.next() - 0.5);
        for (const p of shuffled) {
          if (game.canAfford(game.producerCost(p.id, 1))) {
            game.buyProducer(p.id, 1);
            break;
          }
        }
      }
    },
  };
}

export const ChaoticBot = makeChaoticBot();

/** Buy "Slap Harder", "Grease" and melt-coolant upgrades when affordable (ClickerBot QoL). */
function buyQoL(game: Game): void {
  for (const u of game.availableRunUpgrades()) {
    // Prioritize melt coolant when the buffer is getting thin.
    const affordable = game.canAfford(cost(u.costGoop));
    if (!affordable) continue;
    if (u.effect.kind === 'clickPctOfGps' || u.effect.kind === 'globalGps') {
      game.buyRunUpgrade(u.id);
    } else if (u.effect.kind === 'meltResist' && game.bufferSeconds() < 60) {
      game.buyRunUpgrade(u.id);
    }
  }
}

import { D } from '../src/sim/numbers';
function cost(n: number) {
  return D(n);
}

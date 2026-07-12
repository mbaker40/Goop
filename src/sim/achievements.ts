/**
 * achievements.ts (sim) — pure achievement evaluation (PLAN §7). Builds an AchievementCtx snapshot
 * from the live Game and unlocks anything newly earned into MetaState.achievements. Deterministic:
 * no RNG, no wall clock; the Game's own state is the only input.
 */

import { ACHIEVEMENTS, type AchievementCtx } from '../config/achievements';
import { PRODUCERS } from '../config/producers';
import { displayMeters } from '../config/zones';
import { balance } from '../config/balance';
import type { Game } from './game';

export function buildCtx(game: Game): AchievementCtx {
  const r = game.run;
  const m = game.meta;
  let producersTotal = 0;
  let allProducersOwned = true;
  for (const p of PRODUCERS) {
    const n = r.producersOwned[p.id] ?? 0;
    producersTotal += n;
    if (n <= 0) allProducersOwned = false;
  }
  let metaLevelsTotal = 0;
  for (const k in m.metaLevels) metaLevelsTotal += m.metaLevels[k] ?? 0;
  return {
    totalClicks: m.totalClicks,
    wins: m.wins,
    puddles: m.puddles,
    lifetimeGe: m.lifetimeGe,
    bestMeters: displayMeters(m.bestHeightRaw),
    metaLevelsTotal,
    zone: game.currentZone().index,
    runTime: r.runTime,
    runClicks: r.clicks,
    lifetimeGoopLog10: r.lifetimeGoop.add(1).log10(),
    gpsLog10: game.gps().add(1).log10(),
    comboMaxed: r.combo >= balance.click.comboMaxMult - 1e-9,
    producersOwned: r.producersOwned,
    producersTotal,
    allProducersOwned,
    runUpgradesOwned: r.runUpgrades.length,
    tierUpgradesOwned: r.tierUpgrades.length,
    status: r.status,
  };
}

/** Evaluate all locked achievements; unlock into meta. Returns freshly-unlocked ids (for toasts). */
export function checkAchievements(game: Game): string[] {
  const meta = game.meta;
  if (meta.achievements.length >= ACHIEVEMENTS.length) return [];
  const unlocked = new Set(meta.achievements);
  const ctx = buildCtx(game);
  const fresh: string[] = [];
  for (const a of ACHIEVEMENTS) {
    if (!unlocked.has(a.id) && a.test(ctx)) {
      unlocked.add(a.id);
      meta.achievements.push(a.id);
      fresh.push(a.id);
    }
  }
  return fresh;
}

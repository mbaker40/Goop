/**
 * prestige.ts — Goop Essence math + meta-upgrade purchasing (PLAN §4, §6).
 * Pure functions over MetaState; no side effects on the running game.
 */

import { balance } from '../config/balance';
import { META_BY_ID, type MetaUpgrade } from '../config/upgrades';
import { displayMeters } from '../config/zones';
import { computeMetaBonuses, type MetaState } from './game';

/** GE earned from a finished run (PLAN §4 formula), including meta GE-gain bonus.
 *  Uses flavor "meters" (displayMeters) so payouts match §4's examples. */
export function geEarned(peakHeightRaw: number, won: boolean, meta: MetaState): number {
  const meters = displayMeters(Math.max(0, peakHeightRaw));
  const base = Math.floor(Math.sqrt(meters) / balance.prestige.geCoeffDiv);
  const winMult = won ? balance.prestige.winMultiplier : balance.prestige.loseMultiplier;
  const geGainMult = computeMetaBonuses(meta.metaLevels).geGainMult;
  return Math.floor(base * winMult * geGainMult);
}

/** Cost of the NEXT level of a meta upgrade (×costGrowth per level, PLAN §6). */
export function metaUpgradeCost(m: MetaUpgrade, currentLevel: number): number {
  return Math.ceil(m.baseCostGE * Math.pow(m.costGrowth, currentLevel));
}

/** Can this meta upgrade be leveled up right now? */
export function canBuyMeta(meta: MetaState, id: string): boolean {
  const m = META_BY_ID[id];
  if (!m) return false;
  const lvl = meta.metaLevels[id] ?? 0;
  if (lvl >= m.maxLevel) return false;
  return meta.ge >= metaUpgradeCost(m, lvl);
}

/** Buy one level of a meta upgrade, mutating MetaState. Returns success. */
export function buyMeta(meta: MetaState, id: string): boolean {
  const m = META_BY_ID[id];
  if (!m || !canBuyMeta(meta, id)) return false;
  const lvl = meta.metaLevels[id] ?? 0;
  meta.ge -= metaUpgradeCost(m, lvl);
  meta.metaLevels[id] = lvl + 1;
  return true;
}

/** Bank a finished run into MetaState: award GE, bump win count. */
export function bankRun(meta: MetaState, peakHeightRaw: number, won: boolean): number {
  const ge = geEarned(peakHeightRaw, won, meta);
  meta.ge += ge;
  if (won) meta.wins++;
  if (peakHeightRaw > meta.bestHeightRaw) meta.bestHeightRaw = peakHeightRaw;
  return ge;
}

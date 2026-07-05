/**
 * upgrades.ts — run upgrades + meta (GE) upgrades (PLAN §5.2, §6, §7), data-driven.
 *
 * Three families:
 *  - PRODUCER_TIER_UPGRADES: auto-generated ×2 multipliers per producer at 10/25/50/100 owned.
 *  - RUN_UPGRADES: purchased with goop within a run (e.g. "Slap Harder").
 *  - META_UPGRADES: purchased with Goop Essence, persist across runs (PLAN §6).
 */

import { PRODUCERS } from './producers';

/** A tiered producer multiplier that unlocks at `atOwned` and multiplies that producer's GPS. */
export interface ProducerTierUpgrade {
  id: string;
  producerId: string;
  name: string;
  atOwned: number;
  costGoop: number;
  gpsMult: number;
  flavor: string;
}

const TIER_STEPS = [10, 25, 50, 100] as const;

/** ×2 per tier, unlocking at 10/25/50/100 owned (PLAN §5.2). Cost scales off producer base. */
export const PRODUCER_TIER_UPGRADES: readonly ProducerTierUpgrade[] = PRODUCERS.flatMap((p) =>
  TIER_STEPS.map((step, i) => ({
    id: `${p.id}_tier${step}`,
    producerId: p.id,
    name: `${p.name} ×2 (${step})`,
    atOwned: step,
    // Roughly the cost of buying ~`step` more of the producer; a classic incremental milestone.
    costGoop: p.baseCost * Math.pow(10, i + 1) * step,
    gpsMult: 2,
    flavor: `Your ${p.name} work twice as hard. They are not happy about it.`,
  })),
);

/** Run upgrades bought with goop. `effect` is interpreted by sim/game.ts. */
export interface RunUpgrade {
  id: string;
  name: string;
  costGoop: number;
  effect: RunUpgradeEffect;
  flavor: string;
}

export type RunUpgradeEffect =
  | { kind: 'globalGps'; mult: number }
  | { kind: 'clickPctOfGps'; addPct: number } // "Slap Harder": clicks gain +addPct of GPS
  | { kind: 'meltResist'; frac: number };

export const RUN_UPGRADES: readonly RunUpgrade[] = [
  { id: 'slap1', name: 'Slap Harder I', costGoop: 500, effect: { kind: 'clickPctOfGps', addPct: 0.01 }, flavor: 'Each slap now delivers 1% of your GPS. Physics weeps.' },
  { id: 'slap2', name: 'Slap Harder II', costGoop: 50_000, effect: { kind: 'clickPctOfGps', addPct: 0.02 }, flavor: 'Slaps now carry the weight of your ambitions (+2% GPS).' },
  { id: 'slap3', name: 'Slap Harder III', costGoop: 5e6, effect: { kind: 'clickPctOfGps', addPct: 0.04 }, flavor: 'The tower fears your hand (+4% GPS).' },
  { id: 'grease1', name: 'Grease the Gears', costGoop: 8_000, effect: { kind: 'globalGps', mult: 1.25 }, flavor: 'Everything is 25% goopier. Nobody knows why this helps.' },
  { id: 'grease2', name: 'Grease the Gears II', costGoop: 2e6, effect: { kind: 'globalGps', mult: 1.5 }, flavor: '+50% GPS. The goop has unionized with itself.' },
  { id: 'coolant1', name: 'Emergency Goop Coolant', costGoop: 25_000, effect: { kind: 'meltResist', frac: 0.15 }, flavor: 'Melts 15% slower. Smells of blue raspberry.' },
  { id: 'coolant2', name: 'Industrial Goop Coolant', costGoop: 3e7, effect: { kind: 'meltResist', frac: 0.2 }, flavor: 'Another 20% melt resistance. Do not drink.' },
];

/** Meta upgrades bought with Goop Essence (GE); persist across runs (PLAN §6). */
export interface MetaUpgrade {
  id: string;
  name: string;
  /** Base GE cost; scales ×2.5 per level (PLAN §6). */
  baseCostGE: number;
  maxLevel: number;
  costGrowth: number;
  effect: MetaEffect;
  flavor: string;
}

export type MetaEffect =
  | { kind: 'startProducers'; producerId: string; perLevel: number }
  | { kind: 'globalGpsPct'; perLevel: number } // +X% all GPS
  | { kind: 'meltResistPct'; perLevel: number } // -X% melt
  | { kind: 'comboDurationPct'; perLevel: number }
  | { kind: 'geGainPct'; perLevel: number }
  | { kind: 'clickPowerMult'; perLevel: number };

export const META_UPGRADES: readonly MetaUpgrade[] = [
  { id: 'starterDrippers', name: 'Pre-Installed Plumbing', baseCostGE: 2, maxLevel: 10, costGrowth: 2.5, effect: { kind: 'startProducers', producerId: 'dripper', perLevel: 5 }, flavor: 'Start each run with drippers already leaking.' },
  { id: 'gpsBoost', name: 'Ambient Goopiness', baseCostGE: 3, maxLevel: 20, costGrowth: 2.5, effect: { kind: 'globalGpsPct', perLevel: 0.1 }, flavor: '+10% all GPS per level. The air itself is moist.' },
  { id: 'meltResist', name: 'Thermal Goop Underwear', baseCostGE: 4, maxLevel: 10, costGrowth: 2.5, effect: { kind: 'meltResistPct', perLevel: 0.05 }, flavor: '-5% melt per level. Surprisingly comfortable.' },
  { id: 'comboDur', name: 'Momentum Memory', baseCostGE: 3, maxLevel: 8, costGrowth: 2.5, effect: { kind: 'comboDurationPct', perLevel: 0.15 }, flavor: 'Your combo lingers 15% longer per level.' },
  { id: 'clickPow', name: 'Reinforced Slapping Hand', baseCostGE: 3, maxLevel: 15, costGrowth: 2.5, effect: { kind: 'clickPowerMult', perLevel: 0.25 }, flavor: '+25% base click power per level.' },
  { id: 'geGain', name: 'Essence Distillery', baseCostGE: 5, maxLevel: 15, costGrowth: 2.5, effect: { kind: 'geGainPct', perLevel: 0.1 }, flavor: '+10% Goop Essence from every run.' },
];

export const META_BY_ID: Readonly<Record<string, MetaUpgrade>> = Object.fromEntries(
  META_UPGRADES.map((m) => [m.id, m]),
);

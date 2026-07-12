/**
 * producers.ts - GPS buildings (PLAN §5.2), data-driven.
 * Adding a producer is a config entry, never a new code path (CLAUDE.md style rule).
 */

export interface ProducerDef {
  id: string;
  name: string;
  /** Icon KEY into src/ui/icons.ts (handmade inline SVG; no emoji). */
  icon: string;
  /** Base cost in goop. Cost curve: baseCost * growth^owned (see balance.producerCostGrowth). */
  baseCost: number;
  /** Base goop-per-second for a single unit, before multiplier upgrades. */
  baseGps: number;
  flavor: string;
}

export const PRODUCERS: readonly ProducerDef[] = [
  { id: 'dripper', name: 'Goop Dripper', icon: 'faucet', baseCost: 15, baseGps: 0.1, flavor: 'A leaky faucet, but goop.' },
  { id: 'intern', name: 'Goop Intern', icon: 'tie', baseCost: 100, baseGps: 1, flavor: 'Unpaid. Sighs audibly.' },
  { id: 'cannon', name: 'Goop Cannon', icon: 'cannon', baseCost: 1_100, baseGps: 8, flavor: 'Fires goop at the tower. Sometimes misses (visual only).' },
  { id: 'union', name: 'Unionized Goop Workers', icon: 'hardhat', baseCost: 12_000, baseGps: 47, flavor: 'Tiny goop guys climbing the tower. Demand breaks.' },
  { id: 'goopcopter', name: 'Goopcopter', icon: 'rotor', baseCost: 130_000, baseGps: 380, flavor: 'Helicopter made of goop. Physically upsetting.' },
  { id: 'reactor', name: 'Goop Reactor', icon: 'trefoil', baseCost: 1.4e6, baseGps: 2_600, flavor: 'Do not ask what it fissions.' },
  // Late-ladder costs/outputs diverge from the PLAN §5.2 table on purpose: melt punishes flat
  // GPS, so no rung may cost more than a few minutes of its era's income, and late GPS/cost must
  // hold ~6e-4 or the last third of a run turns into a slog (measured via
  // sim-harness/trajectory.ts; see docs/balance-notes.md).
  { id: 'singularity', name: 'Goop Singularity', icon: 'hole', baseCost: 2e7, baseGps: 22_000, flavor: 'A small black hole that emits goop, against all physics.' },
  { id: 'mother', name: 'The Goop Mother', icon: 'heart', baseCost: 1.5e8, baseGps: 90_000, flavor: 'She loves you. She produces goop.' },
  { id: 'pipeline', name: 'Interdimensional Goop Pipeline', icon: 'swirl', baseCost: 1.1e9, baseGps: 660_000, flavor: 'Steals goop from timelines where you already won.' },
  { id: 'bottle', name: "God's Own Squeeze Bottle", icon: 'bottle', baseCost: 8e9, baseGps: 5e6, flavor: 'Foreshadows Zone 15.' },
] as const;

export const PRODUCER_BY_ID: Readonly<Record<string, ProducerDef>> = Object.fromEntries(
  PRODUCERS.map((p) => [p.id, p]),
);

/**
 * events.ts — the chaos-event pool (PLAN §8). Data-driven: an event is a config entry, not a
 * code path. Numbers here are TUNABLES (weights, durations, payouts); the scheduler mechanics
 * (min gap, one-at-a-time) live in balance.ts.
 *
 * Kinds:
 *  - 'targets'  — tappable things appear; clear them before the timer for onSuccess, else onFail.
 *                 Each target tap pays `gpsSeconds / targets` of current GPS immediately.
 *  - 'decision' — a deal banner with ACCEPT/DECLINE buttons; expiry counts as decline.
 *  - 'aura'     — no interaction; `aura` multipliers apply while the event runs.
 *  - 'bit'      — nothing happens. The bit is the point.
 */

export interface EventEffectSpec {
  gpsMult?: number;
  meltMult?: number;
  clickMult?: number;
  durationSec: number;
  /** Short chip label shown in the HUD while active, e.g. "GPS ×5". */
  label: string;
  icon: string;
}

export interface EventOutcome {
  /** Grant this many seconds of current GPS instantly. For 'targets' events this is the TOTAL
   *  pool paid out per-tap (gpsSeconds / targets each). */
  gpsSeconds?: number;
  /** Multiply the current goop bank (The Investor's "×10 goop now" is goopMult: 10). */
  goopMult?: number;
  /** Drain this fraction of the structural buffer (meteor impact). */
  structuralLossFrac?: number;
  /** A lingering buff/debuff. */
  effect?: EventEffectSpec;
  /** Toast line announcing the outcome. */
  toast?: string;
}

export interface ChaosEventDef {
  id: string;
  name: string;
  icon: string;
  flavor: string;
  kind: 'targets' | 'decision' | 'aura' | 'bit';
  /** Zone-gated pools (PLAN §8): event can fire at or above this zone index. */
  minZone: number;
  /** Relative pick weight within the eligible pool. */
  weight: number;
  /** Seconds the event stays live (interaction window / aura length). */
  durationSec: number;
  /** 'targets' kind: taps needed to clear. */
  targets?: number;
  /** 'aura' kind: multipliers active while the event runs. */
  aura?: EventEffectSpec;
  onSuccess?: EventOutcome;
  onFail?: EventOutcome;
  /** 'decision' kind: outcome of ACCEPT (decline/expiry = nothing happens). */
  onAccept?: EventOutcome;
  /** Altitude-flavored renames, checked top-down (first minZone <= zone wins). */
  namesByZone?: { minZone: number; name: string; icon: string }[];
}

export const CHAOS_EVENTS: readonly ChaosEventDef[] = [
  {
    id: 'goober',
    name: 'Golden Goober Swarm',
    icon: '✨',
    flavor: 'Shiny. Round. Legally goop. TAP THEM ALL.',
    kind: 'targets',
    minZone: 1,
    weight: 3,
    durationSec: 12,
    targets: 8,
    onSuccess: { gpsSeconds: 48, toast: 'Swarm harvested! The goop glitters faintly.' },
    onFail: { gpsSeconds: 0, toast: 'The stragglers waddle away, offended.' },
  },
  {
    id: 'meteor',
    name: 'Goop Meteor',
    icon: '☄️',
    flavor: 'Incoming! Tap it to bits before it lands!',
    kind: 'targets',
    minZone: 2,
    weight: 2,
    durationSec: 9,
    targets: 10,
    onSuccess: { gpsSeconds: 30, toast: 'Meteor absorbed. Tastes like commitment.' },
    onFail: {
      structuralLossFrac: 0.25,
      effect: { clickMult: 3, durationSec: 20, label: 'Anger goop ×3 slap', icon: '😡' },
      toast: 'IMPACT. The tower is furious — slaps hit ×3 for a bit.',
    },
  },
  {
    id: 'inspector',
    name: 'Health Inspector',
    icon: '📋',
    flavor: 'He has a clipboard and concerns. Tap him off the tower!',
    kind: 'targets',
    minZone: 2,
    weight: 2,
    durationSec: 8,
    targets: 1,
    onSuccess: { gpsSeconds: 6, toast: 'Inspector shooed. The violations remain unread.' },
    onFail: {
      effect: { gpsMult: 0.5, durationSec: 30, label: 'Citation: GPS ×0.5', icon: '📋' },
      toast: 'CITED. Production halved while the paperwork clears.',
    },
  },
  {
    id: 'investor',
    name: 'The Investor',
    icon: '💼',
    flavor: 'A suited blob offers ×10 goop NOW for +25% melt (90s). He says "synergy."',
    kind: 'decision',
    minZone: 3,
    weight: 2,
    durationSec: 12,
    onAccept: {
      goopMult: 10,
      effect: { meltMult: 1.25, durationSec: 90, label: 'Hostile melt +25%', icon: '💼' },
      toast: 'Deal closed. The goop is now a growth-stage startup.',
    },
  },
  {
    id: 'heatwave',
    name: 'Heat Wave',
    icon: '🥵',
    flavor: 'Melt ×3! Grow through it or sweat it out.',
    kind: 'aura',
    minZone: 4,
    weight: 2,
    durationSec: 15,
    aura: { meltMult: 3, durationSec: 15, label: 'Melt ×3', icon: '🥵' },
    namesByZone: [
      { minZone: 13, name: 'Divine Side-Eye', icon: '👁️' },
      { minZone: 9, name: 'Solar Flare', icon: '🌞' },
    ],
  },
  {
    id: 'barber',
    name: 'The Barber',
    icon: '💈',
    flavor: 'He looks at the tower. This is not the hair game. He apologizes and leaves.',
    kind: 'bit',
    minZone: 3,
    weight: 0.7,
    durationSec: 8,
  },
] as const;

export const EVENT_BY_ID: Readonly<Record<string, ChaosEventDef>> = Object.fromEntries(
  CHAOS_EVENTS.map((e) => [e.id, e]),
);

/** Display name/icon for an event at a zone (Heat Wave → Solar Flare → Divine Side-Eye). */
export function eventDisplay(def: ChaosEventDef, zone: number): { name: string; icon: string } {
  if (def.namesByZone) {
    for (const n of def.namesByZone) {
      if (zone >= n.minZone) return { name: n.name, icon: n.icon };
    }
  }
  return { name: def.name, icon: def.icon };
}

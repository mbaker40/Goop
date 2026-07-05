/**
 * zones.ts — the 7 zones (PLAN §3) + Endless. Thresholds are on raw sim height
 * (balance.height), NOT the flavor "real-world" meters in the design table — see
 * docs/decisions/0001-m0-scope-and-height-tension.md.
 *
 * `displayScale` maps raw height -> the flavor meters shown in the UI, so the
 * player still climbs "counter -> ceiling -> orbit -> past god" as intended.
 */

export interface ZoneDef {
  index: number; // 1-based
  name: string;
  /** Raw sim-height at which this zone begins (meters in the height() function's units). */
  minHeight: number;
  environment: string;
  meltFlavor: string;
}

/**
 * Raw-height thresholds tuned so an optimized run climbs all 7 zones in ~45-60 min
 * (validated by the sim-harness, §14). See docs/balance-notes.md.
 */
// Raw-height thresholds calibrated to the ClickerBot-median growth curve (see
// docs/balance-notes.md): a strong run climbs Z1->Z7 across ~50 min. Early zones are
// quick dopamine; later zones take progressively longer.
export const ZONES: readonly ZoneDef[] = [
  { index: 1, name: 'The Kitchen Counter', minHeight: 0, environment: 'Tile counter, giant salt shaker, judgmental toaster', meltFlavor: 'Warm stove air' },
  { index: 2, name: 'Through the Ceiling', minHeight: 4, environment: 'Splintered ceiling, attic junk, confused cat photos', meltFlavor: 'Attic heat' },
  { index: 3, name: 'Suburban Skyline', minHeight: 10, environment: 'Rooftops, water towers, one (1) blimp that reads "WHY"', meltFlavor: 'Sun exposure' },
  { index: 4, name: 'Cloud Layer', minHeight: 16, environment: 'Volumetric-ish clouds, passing jet that honks', meltFlavor: 'Jet-stream shear' },
  { index: 5, name: 'Low Orbit', minHeight: 23, environment: 'Satellites, floating astronaut giving thumbs-up', meltFlavor: 'Solar radiation' },
  { index: 6, name: 'Deep Space', minHeight: 31, environment: 'Nebulae, planets with faces, cosmic goop whales', meltFlavor: 'Vacuum sublimation' },
  { index: 7, name: 'PAST GOD', minHeight: 38, environment: 'Blinding gradient void; an enormous marble hand descends', meltFlavor: 'Divine disapproval' },
] as const;

/** Reaching this raw height = beating Zone 7 => WIN (PLAN §3). */
export const WIN_HEIGHT = 41;

/** Flavor display: raw height -> "real world" meters shown in UI (PLAN §3 zone table).
 *  Anchored to the design's zone-meter ranges so GE (derived from meters) matches §4's
 *  examples (Zone 3 ~1 GE, Zone 5 ~60 GE). */
export const DISPLAY_HEIGHT_ANCHORS: readonly { raw: number; meters: number }[] = [
  { raw: 0, meters: 0 },
  { raw: 4, meters: 3 },
  { raw: 10, meters: 30 },
  { raw: 16, meters: 500 },
  { raw: 23, meters: 10_000 },
  { raw: 31, meters: 400_000 },
  { raw: 38, meters: 1.5e11 }, // 1 AU
  { raw: 41, meters: 1e13 },
];

export function zoneForHeight(rawHeight: number): ZoneDef {
  let current = ZONES[0]!;
  for (const z of ZONES) {
    if (rawHeight >= z.minHeight) current = z;
    else break;
  }
  return current;
}

/** Piecewise-log interpolation of raw height to flavor meters for display only. */
export function displayMeters(rawHeight: number): number {
  const a = DISPLAY_HEIGHT_ANCHORS;
  if (rawHeight <= a[0]!.raw) return 0;
  for (let i = 1; i < a.length; i++) {
    const lo = a[i - 1]!;
    const hi = a[i]!;
    if (rawHeight <= hi.raw) {
      const t = (rawHeight - lo.raw) / (hi.raw - lo.raw);
      // interpolate in log space for a smooth exponential-feeling climb
      const loM = Math.max(lo.meters, 0.01);
      return Math.exp(Math.log(loM) + t * (Math.log(hi.meters) - Math.log(loM)));
    }
  }
  // Past the last anchor (Endless): keep multiplying.
  const last = a[a.length - 1]!;
  return last.meters * Math.pow(10, rawHeight - last.raw);
}

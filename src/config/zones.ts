/**
 * zones.ts - the 15 main-game zones + endless zone naming. Thresholds are on raw sim height
 * (balance.height), NOT the flavor "real-world" meters in the display table - see
 * docs/decisions/0001-m0-scope-and-height-tension.md.
 *
 * Raw thresholds are calibrated against sim-harness/trajectory.ts: early zones are quick dopamine
 * (a first-run, no-meta player sees zones 1-5 before their tutorial death), later zones take
 * progressively longer, and a median-meta winning run crosses all 15 in ~45-55 min. The flavor
 * meters ramp exponentially ("but not TOO quick") - roughly ×3-4 per zone until space, then the
 * big leaps.
 */

export interface ZoneDef {
  index: number; // 1-based
  name: string;
  /** Raw sim-height at which this zone begins (units of the height() function). */
  minHeight: number;
  environment: string;
  meltFlavor: string;
}

export const ZONES: readonly ZoneDef[] = [
  { index: 1, name: 'The Kitchen Counter', minHeight: 0, environment: 'Tile counter, salt shaker, judgmental toaster', meltFlavor: 'Warm stove air' },
  { index: 2, name: 'Top of the Fridge', minHeight: 8.5, environment: 'Dusty cereal boxes, one lost magnet', meltFlavor: 'Refrigerator exhaust' },
  { index: 3, name: 'Through the Ceiling', minHeight: 11, environment: 'Splintered ceiling, attic junk, confused cat photos', meltFlavor: 'Attic heat' },
  { index: 4, name: 'The Roofline', minHeight: 13.5, environment: 'Shingles, a startled weathervane, gutter goop', meltFlavor: 'Sun-baked shingles' },
  { index: 5, name: 'Suburban Skyline', minHeight: 16, environment: 'Rooftops, water towers, one (1) blimp that reads "WHY"', meltFlavor: 'Sun exposure' },
  { index: 6, name: 'Kite & Balloon Alley', minHeight: 19, environment: 'Kites, hot-air balloons, extremely lost frisbees', meltFlavor: 'Updraft friction' },
  { index: 7, name: 'The Cloud Layer', minHeight: 22.5, environment: 'Volumetric-ish clouds, passing jet that honks', meltFlavor: 'Jet-stream shear' },
  { index: 8, name: 'Thin Air', minHeight: 26.5, environment: 'Weather balloons, very confused geese', meltFlavor: 'Thin-air evaporation' },
  { index: 9, name: 'The Stratosphere', minHeight: 31, environment: 'Indigo hush, sprite lightning, science instruments', meltFlavor: 'Stratospheric dryness' },
  { index: 10, name: 'Edge of Space', minHeight: 36, environment: 'The blue fades out; the stars fade in', meltFlavor: 'Boundary-layer burn' },
  { index: 11, name: 'Low Orbit', minHeight: 42, environment: 'Satellites, floating astronaut giving thumbs-up', meltFlavor: 'Solar radiation' },
  { index: 12, name: "The Moon's Neighborhood", minHeight: 49, environment: 'The Moon, pretending not to notice', meltFlavor: 'Lunar indifference' },
  { index: 13, name: 'Deep Space', minHeight: 57, environment: 'Nebulae, planets with faces, cosmic goop whales', meltFlavor: 'Vacuum sublimation' },
  { index: 14, name: 'The Goopiverse Rim', minHeight: 66, environment: 'Reality gets pastel and non-committal', meltFlavor: 'Existential leakage' },
  { index: 15, name: 'PAST GOD', minHeight: 78, environment: 'Blinding gradient void; an enormous marble hand descends', meltFlavor: 'Divine disapproval' },
] as const;

/** Reaching this raw height = beating Zone 15 => WIN (PLAN §3). */
export const WIN_HEIGHT = 100;

/** Flavor display: raw height -> "real world" meters shown in UI. Anchored at each zone start;
 *  exponential ramp (~×3-4/zone early, bigger leaps in space). GE derives from these meters. */
export const DISPLAY_HEIGHT_ANCHORS: readonly { raw: number; meters: number }[] = [
  { raw: 0, meters: 0 },
  { raw: 8.5, meters: 1.8 }, // fridge top
  { raw: 11, meters: 6 }, // ceiling
  { raw: 13.5, meters: 15 }, // roofline
  { raw: 16, meters: 60 }, // skyline
  { raw: 19, meters: 250 }, // kite & balloon alley
  { raw: 22.5, meters: 1_500 }, // clouds
  { raw: 26.5, meters: 8_000 }, // thin air
  { raw: 31, meters: 25_000 }, // stratosphere
  { raw: 36, meters: 90_000 }, // edge of space
  { raw: 42, meters: 500_000 }, // low orbit
  { raw: 49, meters: 5e7 }, // moon's neighborhood (~50,000 km out)
  { raw: 57, meters: 4e8 }, // deep space (past the Moon)
  { raw: 66, meters: 1.5e11 }, // goopiverse rim (1 AU)
  { raw: 78, meters: 1e13 }, // past god's doorstep
  { raw: 100, meters: 1e14 }, // the win line
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

/** Invert displayMeters: the raw height at which the tower reaches `meters` (for placing
 *  real-world-sized scale markers at their real altitudes). */
export function rawForMeters(meters: number): number {
  const a = DISPLAY_HEIGHT_ANCHORS;
  if (meters <= 0) return 0;
  for (let i = 1; i < a.length; i++) {
    const lo = a[i - 1]!;
    const hi = a[i]!;
    if (meters <= hi.meters) {
      const loM = Math.max(lo.meters, 0.01);
      const t = (Math.log(meters) - Math.log(loM)) / (Math.log(hi.meters) - Math.log(loM));
      return lo.raw + Math.max(0, Math.min(1, t)) * (hi.raw - lo.raw);
    }
  }
  const last = a[a.length - 1]!;
  return last.raw + Math.log10(meters / last.meters);
}

// ---- Endless zone names (M4 uses these past the win line; deterministic, no RNG state) ----

const ENDLESS_ADJ = ['Buttered', 'Recursive', 'Unlicensed', 'Damp', 'Forbidden', 'Iridescent', 'Backwards', 'Haunted', 'Complimentary', 'Load-Bearing', 'Improbable', 'Lukewarm', 'Classified', 'Echoing', 'Upside-Down', 'Artisanal'] as const;
const ENDLESS_NOUN = ['Expanse', 'Corridor', 'Marsh', 'Antechamber', 'Buffet', 'Meridian', 'Undertow', 'Mezzanine', 'Static', 'Confluence', 'Backrooms', 'Reverie', 'Overflow', 'Diorama', 'Interlude', 'Franchise'] as const;

/** Name for the Nth endless layer (0-based), e.g. "The Haunted Mezzanine". Deterministic hash. */
export function endlessZoneName(layer: number): string {
  const h = (layer * 2654435761) >>> 0;
  const adj = ENDLESS_ADJ[h % ENDLESS_ADJ.length]!;
  const noun = ENDLESS_NOUN[(h >> 7) % ENDLESS_NOUN.length]!;
  return `The ${adj} ${noun}`;
}

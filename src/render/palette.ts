/**
 * palette.ts - renderer-owned zone colour palettes.
 * PLAN §10 imagines palettes living in config/zones, but `ZoneDef` has none yet and adding them
 * is a sim/config change out of scope for this render slice - so the renderer owns its own map.
 * Indexed by zone.index (1-based); index 0 is the fallback.
 */

export interface ZonePalette {
  skyTop: number;
  skyBottom: number;
  goop: number;
  ground: number;
  fog: number;
}

const P: Record<number, ZonePalette> = {
  0: { skyTop: 0x1a1626, skyBottom: 0x0d0b14, goop: 0x9be34a, ground: 0x2a2436, fog: 0x14121a },
  1: { skyTop: 0xffe9b0, skyBottom: 0xf7c98a, goop: 0xb6e84a, ground: 0xd9c7a3, fog: 0xf3d9a8 }, // Kitchen counter
  2: { skyTop: 0xf6e6c4, skyBottom: 0xe2c898, goop: 0xb6e84a, ground: 0xcdb691, fog: 0xe8d3a8 }, // Top of the fridge
  3: { skyTop: 0xcdb48a, skyBottom: 0x8a6f4e, goop: 0xb0e050, ground: 0x6f5a3a, fog: 0x8a6f4e }, // Through the ceiling
  4: { skyTop: 0xb8d8f2, skyBottom: 0xe8d9b8, goop: 0xa5e455, ground: 0x87755a, fog: 0xcfd9d2 }, // The roofline
  5: { skyTop: 0x9fd2ff, skyBottom: 0xdfeeff, goop: 0x8fe06a, ground: 0x8a97a5, fog: 0xbfe0ff }, // Suburban skyline
  6: { skyTop: 0x8ec8ff, skyBottom: 0xf2f7ff, goop: 0x86e086, ground: 0x9aa7b5, fog: 0xcfe6ff }, // Kite & balloon alley
  7: { skyTop: 0xbfe0ff, skyBottom: 0xffffff, goop: 0x7fe0c0, ground: 0xeaf3ff, fog: 0xdfeeff }, // The cloud layer
  8: { skyTop: 0x7fb2e8, skyBottom: 0xcfe4f6, goop: 0x74dcc8, ground: 0xb8cfe0, fog: 0xa8ccec }, // Thin air
  9: { skyTop: 0x3a5a9a, skyBottom: 0x88aad4, goop: 0x6ad8d8, ground: 0x5a74a0, fog: 0x4a6aaa }, // The stratosphere
  10: { skyTop: 0x131c48, skyBottom: 0x4a6aa8, goop: 0x66d8e8, ground: 0x2a3a66, fog: 0x1c2a56 }, // Edge of space
  11: { skyTop: 0x0a1030, skyBottom: 0x1a2a6a, goop: 0x66e0ff, ground: 0x141c3a, fog: 0x0a1030 }, // Low orbit
  12: { skyTop: 0x070a20, skyBottom: 0x141c44, goop: 0x8ab8ff, ground: 0x0e1430, fog: 0x080c24 }, // Moon's neighborhood
  13: { skyTop: 0x05010f, skyBottom: 0x180a3a, goop: 0xc060ff, ground: 0x0a0620, fog: 0x05010f }, // Deep space
  14: { skyTop: 0x1c0a2e, skyBottom: 0x4a1c5a, goop: 0xe882d8, ground: 0x2a1038, fog: 0x220e34 }, // Goopiverse rim
  15: { skyTop: 0xfff4d6, skyBottom: 0xffd36a, goop: 0xffe066, ground: 0xf0e0b0, fog: 0xfff0c0 }, // Past God
};

export function paletteFor(zoneIndex: number): ZonePalette {
  return P[zoneIndex] ?? P[0]!;
}

// ---- Continuous ascent gradient ----
// The environment blends smoothly with ALTITUDE instead of hard-swapping per zone ("continuous
// gradient, not stark room change"): each zone's palette is anchored at its minHeight and the
// displayed palette is the piecewise-linear blend between anchors. Zone identity is announced by
// the toast/sting/props, not by a color cut.

import { ZONES, WIN_HEIGHT } from '../config/zones';

interface Anchor {
  raw: number;
  p: ZonePalette;
}
const ANCHORS: Anchor[] = [
  ...ZONES.map((z) => ({ raw: z.minHeight, p: P[z.index] ?? P[0]! })),
  { raw: WIN_HEIGHT, p: P[15]! },
];

function lerpChannel(a: number, b: number, t: number): number {
  const ar = a >> 16, ag = (a >> 8) & 0xff, ab = a & 0xff;
  const br = b >> 16, bg = (b >> 8) & 0xff, bb = b & 0xff;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return (r << 16) | (g << 8) | bl;
}

/** The palette at a given raw height - a smooth blend between zone anchors. */
export function paletteAt(rawHeight: number, out: ZonePalette = { skyTop: 0, skyBottom: 0, goop: 0, ground: 0, fog: 0 }): ZonePalette {
  const h = Math.max(0, rawHeight);
  let lo = ANCHORS[0]!;
  let hi = ANCHORS[ANCHORS.length - 1]!;
  for (let i = 1; i < ANCHORS.length; i++) {
    if (h <= ANCHORS[i]!.raw) {
      lo = ANCHORS[i - 1]!;
      hi = ANCHORS[i]!;
      break;
    }
    if (i === ANCHORS.length - 1) lo = hi; // past the last anchor (Endless): hold
  }
  const t = lo === hi ? 0 : Math.min(1, (h - lo.raw) / Math.max(1e-6, hi.raw - lo.raw));
  out.skyTop = lerpChannel(lo.p.skyTop, hi.p.skyTop, t);
  out.skyBottom = lerpChannel(lo.p.skyBottom, hi.p.skyBottom, t);
  out.goop = lerpChannel(lo.p.goop, hi.p.goop, t);
  out.ground = lerpChannel(lo.p.ground, hi.p.ground, t);
  out.fog = lerpChannel(lo.p.fog, hi.p.fog, t);
  return out;
}

/**
 * palette.ts — renderer-owned zone colour palettes.
 * PLAN §10 imagines palettes living in config/zones, but `ZoneDef` has none yet and adding them
 * is a sim/config change out of scope for this render slice — so the renderer owns its own map.
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
  2: { skyTop: 0xcdb48a, skyBottom: 0x8a6f4e, goop: 0xb6e84a, ground: 0x6f5a3a, fog: 0x8a6f4e }, // Attic
  3: { skyTop: 0x9fd2ff, skyBottom: 0xdfeeff, goop: 0x8fe06a, ground: 0x8a97a5, fog: 0xbfe0ff }, // Skyline
  4: { skyTop: 0xbfe0ff, skyBottom: 0xffffff, goop: 0x7fe0c0, ground: 0xeaf3ff, fog: 0xdfeeff }, // Clouds
  5: { skyTop: 0x0a1030, skyBottom: 0x1a2a6a, goop: 0x66e0ff, ground: 0x141c3a, fog: 0x0a1030 }, // Low orbit
  6: { skyTop: 0x05010f, skyBottom: 0x180a3a, goop: 0xc060ff, ground: 0x0a0620, fog: 0x05010f }, // Deep space
  7: { skyTop: 0xfff4d6, skyBottom: 0xffd36a, goop: 0xffe066, ground: 0xf0e0b0, fog: 0xfff0c0 }, // Past God
};

export function paletteFor(zoneIndex: number): ZonePalette {
  return P[zoneIndex] ?? P[0]!;
}

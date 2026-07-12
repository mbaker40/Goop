/**
 * quality.ts - render quality tiers (PLAN §9.1 / §13). Auto-detected once at boot:
 * coarse-pointer (touch) devices get a lower marching-cubes resolution and a tighter
 * devicePixelRatio clamp so mid-range phones hold 60 fps. Everything degrades gracefully.
 */

export interface RenderQuality {
  /** Marching-cubes field resolution (cost is O(res³) per rebuild). */
  resolution: number;
  /** devicePixelRatio clamp. */
  maxDpr: number;
  /** Metaball field rebuilds per second (transforms/camera still run at rAF rate). */
  fieldHz: number;
}

export function detectQuality(): RenderQuality {
  const coarse = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;
  if (coarse) {
    return { resolution: 32, maxDpr: 1.75, fieldHz: 30 };
  }
  return { resolution: 40, maxDpr: 2, fieldHz: 60 };
}

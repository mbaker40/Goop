/**
 * stage.ts - the shared side-view stage math (2026-07 crop rework). tower.ts (mesh), markers.ts
 * (prop parking) and index.ts (scroll) must agree on these curves EXACTLY, so they live in one
 * pure module.
 *
 * The model: the goop body grows to its FULL mesh height fast (by raw GROW_RAW - the whole
 * "getting bigger" show happens while it still stands in the kitchen), and once the world
 * scroll starts (raw > R0) the goop rides the SAME scroll as the counter - its foot stays
 * glued to the departing ground - until it has sunk SINK_MAX world units. From then on only
 * the TOP of the goop is in frame: the crown parks at CROWN_HOLD (~mid-screen) forever and
 * every further meter of growth is told by the world sweeping down past it. No shaft, no
 * seam - it is one continuous mesh whose lower half is simply below the screen.
 */

export const TOWER_WORLD_HEIGHT = 10;
/** Uniform stage magnification (the goop should command the frame). */
export const STAGE_SCALE = 1.3;
/** Raw height at which the goop mesh reaches full size. Must be <= R0 + SINK_MAX / K2 (raw 8)
 *  or the crown dips while the foot is still riding the scroll down. */
export const GROW_RAW = 8;
/** How far the goop sinks below its rooted position before the crown locks. Chosen so the
 *  foot is safely under the frame bottom in both orientations at zoom 1. */
export const SINK_MAX = 6;
/** World-units of scroll per raw unit once the ride starts (R0 = leaving the counter). */
export const K2 = 3;
export const R0 = 6;

export function scrollOf(raw: number): number {
  return K2 * Math.max(0, raw - R0);
}

/** How far the goop object is sunk at a given scroll (foot glued to the world until capped). */
export function towerSink(scroll: number): number {
  return Math.min(SINK_MAX, scroll);
}

/** The goop crown in tower-LOCAL y (rooted at y=0) - mirrors tower.ts fill math. */
export function meshCrown(raw: number): number {
  const fill = Math.min(1, Math.max(0.03, raw / GROW_RAW));
  return TOWER_WORLD_HEIGHT * STAGE_SCALE * (0.07 + fill * 0.76);
}

/** The goop crown as DISPLAYED (after the sink). Rises to ~8.3 world by raw 6, then settles
 *  to ~4.8 by raw 8 and holds there for the rest of the game. */
export function crownDisplay(raw: number): number {
  return meshCrown(raw) - towerSink(scrollOf(raw));
}

/* The numbers behind the Star Dust perks that the economy itself reads (feeder rates). A leaf module with
   no imports, so econ.js can use it without an import cycle; prestige.js re-exports everything here and
   owns the rest of the perk maths. Pure. */

// Late Feeders: the last four feeders (the Vacuum Straw, the Light Cone Ladle, the Horizon Hopper and the
// Dark Matter Whisk) work this many times harder, by perk level.
export const LATE_FROM = 15;                 // feeder stage from which a feeder counts as late
export const LATE_MULT = [1, 1.5, 2];
export function lateMult(level, feederStage) { return feederStage >= LATE_FROM ? LATE_MULT[Math.min(level | 0, LATE_MULT.length - 1)] : 1; }

// Cosmic Memory: every feeder works harder for each Big Bang the goop has been through, for good.
export const BANG_STEP = [0, 0.05, 0.1];      // extra share per Big Bang, by perk level
export function bangMult(level, bangs) { return 1 + BANG_STEP[Math.min(level | 0, BANG_STEP.length - 1)] * Math.max(0, bangs | 0); }

// Quicker Fingers: every hand feed is worth this much more, by perk level.
export const HAND_MULT = [1, 1.05, 1.1];
export function handMult(level) { return HAND_MULT[Math.min(level | 0, HAND_MULT.length - 1)]; }

// Mutation Discount: Mutations cost this share of their price, by perk level.
export const MUT_COST = [1, 0.9, 0.8];
export function mutCost(level) { return MUT_COST[Math.min(level | 0, MUT_COST.length - 1)]; }

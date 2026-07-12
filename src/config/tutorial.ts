/**
 * tutorial.ts - the Judgmental Toaster's onboarding script (data-driven, like everything).
 *
 * Each step: what the toaster says, his expression, a PURE goal predicate over the live Game
 * (the step completes the emit after it turns true), which HUD pieces become visible from this
 * step on, and an optional element to point at. The overlay logic lives in src/ui/tutorial.ts;
 * this file is content only. meta.tutorialStep persists progress; >= TUTORIAL_STEPS.length =
 * done. Existing saves are migrated straight to done (save/index.ts).
 */

import type { Game } from '../sim/game';

export type ToasterFace = 'judge' | 'alarm' | 'approve';

export interface TutorialStep {
  id: string;
  /** Speech-bubble lines, shown in sequence (tap the bubble to advance within a step). */
  lines: string[];
  face: ToasterFace;
  /** Step completes once true (checked on every store emit). */
  goal: (g: Game) => boolean;
  /** DOM ids revealed from this step onward (everything else stays hidden until listed). */
  reveal: string[];
  /** Element id to pulse a pointer ring over while the step is active. */
  pointAt?: string;
}

/** HUD ids the tutorial manages. Anything listed here is hidden at step 0 and appears only
 *  when a step reveals it. (Unlisted chrome - pause etc. - is untouched.) */
export const TUTORIAL_MANAGED = [
  'hud-stats',
  'sr-combo-label',
  'sr-combo-track',
  'shop-fab',
  'hud-shop',
  'sr-hint',
] as const;

export const TUTORIAL_STEPS: readonly TutorialStep[] = [
  {
    id: 'intro',
    lines: ['Oh no. Not again.', "That's goop. It's on MY counter.", 'Slap it. See if I care.'],
    face: 'judge',
    goal: (g) => g.run.clicks >= 5,
    reveal: [],
    pointAt: 'stage',
  },
  {
    id: 'combo',
    lines: ['Faster. It likes rhythm.', "That's revolting."],
    face: 'alarm',
    goal: (g) => g.run.combo >= 2,
    reveal: ['sr-combo-label', 'sr-combo-track'],
  },
  {
    id: 'shop',
    lines: ["It's... hiring?", "Buy it a Dripper. I can't watch."],
    face: 'alarm',
    goal: (g) => (g.run.producersOwned['dripper'] ?? 0) >= 1,
    reveal: ['shop-fab', 'hud-shop', 'hud-stats'],
    pointAt: 'shop-fab',
  },
  {
    id: 'melt',
    lines: ['It melts when it gets lazy.', 'Like my nephew.', 'Keep it growing or it puddles.'],
    face: 'judge',
    goal: (g) => g.run.runTime >= 120 || g.currentZone().index >= 2,
    reveal: ['sr-hint'],
    pointAt: 'sr-melt-row',
  },
  {
    id: 'sendoff',
    lines: ['Reach the fridge. Ruin everything.', 'Whatever. I believe in you.', 'I regret saying that.'],
    face: 'approve',
    goal: () => true, // completes as soon as the lines are read
    reveal: [],
  },
] as const;

/** The retention beat: shown once on the FIRST collapse (puddle screen). */
export const PUDDLE_TIP = {
  lines: ['Every puddle makes you stronger.', 'I read that on a mug.', 'Spend the Essence. Come back angrier.'],
  face: 'approve' as ToasterFace,
};

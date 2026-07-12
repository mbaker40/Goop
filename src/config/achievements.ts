/**
 * achievements.ts - 100 achievements (PLAN §7), data-driven. 100 is the Steam per-app cap, so the
 * board is already store-shaped. Each achievement grants +0.5% goop/sec (balance.achievements) -
 * small, permanent, Cookie-Clicker style.
 *
 * Conditions are pure predicates over an AchievementCtx snapshot (built by sim/achievements.ts
 * from the live Game) so the whole system stays deterministic and testable. Flavor must be funny
 * (CLAUDE.md style rule) - if a name could appear in a serious game, rename it.
 */

export interface AchievementCtx {
  // Lifetime (meta) -
  totalClicks: number;
  wins: number;
  puddles: number;
  lifetimeGe: number;
  bestMeters: number;
  metaLevelsTotal: number;
  // Current run -
  zone: number;
  runTime: number;
  runClicks: number;
  lifetimeGoopLog10: number;
  gpsLog10: number;
  comboMaxed: boolean;
  producersOwned: Readonly<Record<string, number>>;
  producersTotal: number;
  allProducersOwned: boolean;
  runUpgradesOwned: number;
  tierUpgradesOwned: number;
  status: string;
}

export interface AchievementDef {
  id: string;
  name: string;
  /** Icon KEY into the handmade SVG set (src/ui/icons.ts) - config stays DOM-free. */
  icon: string;
  /** Tier within a family (1-based) - rendered as pips on the board tile. */
  tier?: number;
  flavor: string;
  test: (c: AchievementCtx) => boolean;
}

const A = (
  id: string,
  name: string,
  icon: string,
  flavor: string,
  test: (c: AchievementCtx) => boolean,
  tier?: number,
): AchievementDef => ({ id, name, icon, tier, flavor, test });

// ---- Lifetime clicks (6) ----
const clicks: AchievementDef[] = [
  A('click1', 'First Splat', 'hand', 'You slapped the goop. The goop remembers.', (c) => c.totalClicks >= 1, 1),
  A('click100', 'Palm Warmer', 'hand', '100 lifetime slaps. The goop considers this flirting.', (c) => c.totalClicks >= 100, 2),
  A('click1k', 'Do Not Lick', 'hand', '1,000 lifetime slaps. Please also do not lick.', (c) => c.totalClicks >= 1_000, 3),
  A('click10k', 'Carpal Goopnel', 'hand', '10,000 lifetime slaps. Your wrist files a complaint.', (c) => c.totalClicks >= 10_000, 4),
  A('click100k', 'The Hundred-Thousand Hand Slap', 'hand', '100,000 lifetime slaps. Octopi take notes.', (c) => c.totalClicks >= 100_000, 5),
  A('click1m', 'One In A Million (Slaps)', 'hand', '1,000,000 lifetime slaps. The goop got you a card.', (c) => c.totalClicks >= 1_000_000, 6),
];

// ---- Producer collections: 10 producers × own 1 / 50 / 100 / 400 (40) ----
interface ProdMeta {
  id: string;
  icon: string;
  short: string;
  first: string; // flavor for owning the first one
}
const PRODS: ProdMeta[] = [
  { id: 'dripper', icon: 'faucet', short: 'Dripper', first: 'It drips. That is all it does. It is enough.' },
  { id: 'intern', icon: 'tie', short: 'Intern', first: 'They asked about dental. You laughed together. Only you laughed.' },
  { id: 'cannon', icon: 'cannon', short: 'Cannon', first: 'OSHA has not approved this. OSHA has not been told.' },
  { id: 'union', icon: 'hardhat', short: 'Union Crew', first: 'They demand breaks. The breaks are goop.' },
  { id: 'goopcopter', icon: 'rotor', short: 'Goopcopter', first: 'It should not fly. It flies out of spite.' },
  { id: 'reactor', icon: 'trefoil', short: 'Reactor', first: 'The manual is one page. The page says "no".' },
  { id: 'singularity', icon: 'hole', short: 'Singularity', first: 'Physics called. You let it go to voicemail.' },
  { id: 'mother', icon: 'heart', short: 'Goop Mother', first: 'She is proud of you. This is new for you.' },
  { id: 'pipeline', icon: 'swirl', short: 'Pipeline', first: 'Alternate-you is furious. Alternate-you can cope.' },
  { id: 'bottle', icon: 'bottle', short: 'Squeeze Bottle', first: 'It is exactly what it sounds like, at a scale it should not be.' },
];
const PROD_TIERS: { n: number; label: (s: string) => string; flavor: (s: string) => string }[] = [
  { n: 1, label: (s) => `My First ${s}`, flavor: () => '' /* per-producer flavor used */ },
  { n: 50, label: (s) => `${s} Enthusiast`, flavor: (s) => `50 ${s}s. "Enthusiast" is the polite word.` },
  { n: 100, label: (s) => `${s} Cartel`, flavor: (s) => `100 ${s}s. Authorities describe the operation as "moist".` },
  { n: 400, label: (s) => `${s} Post-Scarcity`, flavor: (s) => `400 ${s}s. Economists have stopped calling back.` },
];
const producers: AchievementDef[] = PRODS.flatMap((p) =>
  PROD_TIERS.map((t, ti) =>
    A(
      `own_${p.id}_${t.n}`,
      t.label(p.short),
      p.icon,
      t.n === 1 ? p.first : t.flavor(p.short),
      (c) => (c.producersOwned[p.id] ?? 0) >= t.n,
      ti + 1,
    ),
  ),
);

// ---- Zones reached (6) ----
const zones: AchievementDef[] = [
  A('zone2', 'Ceiling? Never Met Her', 'house', 'Reach Zone 3: Through the Ceiling. The attic was not ready.', (c) => c.zone >= 3),
  A('zone3', 'Suburban Menace', 'rooftops', 'Reach Zone 5: Suburban Skyline. The HOA is drafting a letter.', (c) => c.zone >= 5),
  A('zone4', 'Cloud Loiterer', 'cloud', 'Reach Zone 7: The Cloud Layer. A jet honked at you.', (c) => c.zone >= 7),
  A('zone5', 'Orbital Goopware', 'satellite', 'Reach Zone 11: Low Orbit. The astronaut gave a thumbs-up. He gets it.', (c) => c.zone >= 11),
  A('zone6', 'Deep Space Slime', 'planet', 'Reach Zone 13: Deep Space. The goop whales sing of you.', (c) => c.zone >= 13),
  A('zone7', "Knocking On God's Door", 'gate', 'Reach Zone 15: PAST GOD. He can hear you squelching.', (c) => c.zone >= 15),
];

// ---- Wins (3) ----
const wins: AchievementDef[] = [
  A('win1', 'PAST GOD', 'trophy', 'Win a run. The hand gave a slow thumbs-up.', (c) => c.wins >= 1),
  A('win3', 'Habitual Deity', 'crown', 'Win 3 runs. Heaven has installed a doorbell camera.', (c) => c.wins >= 3),
  A('win10', 'Restraining Order (Divine)', 'scroll', 'Win 10 runs. You are legally required to stay 1 AU away.', (c) => c.wins >= 10),
];

// ---- Puddles / losses (4) ----
const puddles: AchievementDef[] = [
  A('puddle1', 'Puddle Person', 'puddle', 'Lose your first run. Every puddle makes you stronger.', (c) => c.puddles >= 1, 1),
  A('puddle5', 'Frequent Flooder', 'puddle', 'Melt 5 times. The mop has a name now. It is Gerald.', (c) => c.puddles >= 5, 2),
  A('puddle25', 'Serial Moisturizer', 'puddle', 'Melt 25 times. Insurance has questions.', (c) => c.puddles >= 25, 3),
  A('puddle100', 'One Hundred Percent Humidity', 'puddle', 'Melt 100 times. At this point it is a lifestyle.', (c) => c.puddles >= 100, 4),
];

// ---- Best height, flavor meters (6) ----
const heights: AchievementDef[] = [
  A('h30', 'Taller Than A Fridge', 'ruler', 'Reach 30 m. The fridge is jealous. The fridge says nothing.', (c) => c.bestMeters >= 30, 1),
  A('h500', 'Airspace Violation', 'ruler', 'Reach 500 m. Kites now file flight plans around you.', (c) => c.bestMeters >= 500, 2),
  A('h10k', 'Cruising Altitude', 'ruler', 'Reach 10 km. Cabin crew, arm doors and cross-check the goop.', (c) => c.bestMeters >= 10_000, 3),
  A('h400k', 'Moonshot Adjacent', 'ruler', 'Reach 400,000 km. The Moon pretends not to notice.', (c) => c.bestMeters >= 400_000_000 / 1000, 4),
  A('h1au', 'One Astronomical Unit Of Goop', 'ruler', 'Reach 1 AU. The Sun squints at you.', (c) => c.bestMeters >= 1.5e11, 5),
  A('h1e13', 'Measurement Error', 'ruler', 'Reach 10¹³ m. Scientists assume the instrument is broken.', (c) => c.bestMeters >= 1e13, 6),
];

// ---- Lifetime Goop Essence (5) ----
const essence: AchievementDef[] = [
  A('ge10', 'Essence Of Failure', 'flask', 'Bank 10 lifetime GE. Distilled directly from mistakes.', (c) => c.lifetimeGe >= 10, 1),
  A('ge100', 'Puddle Sommelier', 'flask', 'Bank 100 lifetime GE. "Ah yes, a 2026. Notes of collapse."', (c) => c.lifetimeGe >= 100, 2),
  A('ge1k', 'Essence Hoarder', 'flask', 'Bank 1,000 lifetime GE. It is not a problem if it is progress.', (c) => c.lifetimeGe >= 1_000, 3),
  A('ge25k', 'Goop Trust Fund', 'flask', 'Bank 25,000 lifetime GE. Your puddles have a financial advisor.', (c) => c.lifetimeGe >= 25_000, 4),
  A('ge250k', 'Essence Baron', 'flask', 'Bank 250,000 lifetime GE. You own the concept of melting.', (c) => c.lifetimeGe >= 250_000, 5),
];

// ---- Meta levels total (4) ----
const meta: AchievementDef[] = [
  A('meta1', 'Slightly Permanent', 'wrench', 'Buy your first permanent upgrade. It survives the puddle. You will not.', (c) => c.metaLevelsTotal >= 1, 1),
  A('meta10', 'Build Different', 'wrench', '10 permanent upgrade levels. The goop respects the grind.', (c) => c.metaLevelsTotal >= 10, 2),
  A('meta25', 'Meta Goopling', 'wrench', '25 permanent upgrade levels. You are becoming the tower.', (c) => c.metaLevelsTotal >= 25, 3),
  A('meta50', 'Foreverware', 'wrench', '50 permanent upgrade levels. Death is now a minor inconvenience.', (c) => c.metaLevelsTotal >= 50, 4),
];

// ---- Run upgrades owned in one run (3) ----
const runUps: AchievementDef[] = [
  A('runup3', 'Window Shopper No More', 'backpack', 'Own 3 upgrades in one run. The economy thanks you.', (c) => c.runUpgradesOwned >= 3, 1),
  A('runup8', 'Kitted Out', 'backpack', 'Own 8 upgrades in one run. The tower has accessories.', (c) => c.runUpgradesOwned >= 8, 2),
  A('runup12', 'Full Send Loadout', 'backpack', 'Own every upgrade in one run. NASA is still asking about your hand.', (c) => c.runUpgradesOwned >= 12, 3),
];

// ---- Tier upgrades in one run (3) ----
const tiers: AchievementDef[] = [
  A('tier5', 'Twice As Nice', 'chart', 'Buy 5 ×2 boosts in one run. Multiplication: discovered.', (c) => c.tierUpgradesOwned >= 5, 1),
  A('tier15', 'Exponential Intent', 'chart', 'Buy 15 ×2 boosts in one run. The graph looks illegal.', (c) => c.tierUpgradesOwned >= 15, 2),
  A('tier30', 'Doubling Down Down Down', 'chart', 'Buy 30 ×2 boosts in one run. Your calculator shows a skull.', (c) => c.tierUpgradesOwned >= 30, 3),
];

// ---- Run lifetime goop, log10 (4) ----
const goopTotals: AchievementDef[] = [
  A('goop1k', 'Thousandaire (Goop)', 'moneybag', 'Earn 1,000 goop in one run. Liquid assets. Literally.', (c) => c.lifetimeGoopLog10 >= 3, 1),
  A('goop1m', 'Goop Millionaire', 'moneybag', 'Earn 1,000,000 goop in one run. Forbes declines to cover it.', (c) => c.lifetimeGoopLog10 >= 6, 2),
  A('goop1b', 'Gooponaire', 'moneybag', 'Earn 1e9 goop in one run. The bank requests you stop visiting.', (c) => c.lifetimeGoopLog10 >= 9, 3),
  A('goop1t', 'GDP Of Goop', 'moneybag', 'Earn 1e12 goop in one run. Small nations send trade delegations.', (c) => c.lifetimeGoopLog10 >= 12, 4),
];

// ---- GPS reached, log10 (4) ----
const gps: AchievementDef[] = [
  A('gps10', 'Ten A Second', 'stopwatch', 'Reach 10 goop/sec. The faucet is proud.', (c) => c.gpsLog10 >= 1, 1),
  A('gps1k', 'Kilogoop Per Second', 'stopwatch', 'Reach 1,000 goop/sec. The SI committee is uneasy.', (c) => c.gpsLog10 >= 3, 2),
  A('gps100k', 'Industrial Ooze Complex', 'stopwatch', 'Reach 100,000 goop/sec. The pipeline hums a work song.', (c) => c.gpsLog10 >= 5, 3),
  A('gps10m', 'Goop Hose Untethered', 'stopwatch', 'Reach 10,000,000 goop/sec. It cannot be shut off. Nobody asked to.', (c) => c.gpsLog10 >= 7, 4),
];

// ---- Combo + per-run clicks (3) ----
const combo: AchievementDef[] = [
  A('comboMax', 'Maximum Momentum', 'flame', 'Max out the slap combo. Your hand is a renewable resource.', (c) => c.comboMaxed),
  A('runclick500', 'Warm Palms', 'drum', '500 slaps in one run. The goop knows your handprint.', (c) => c.runClicks >= 500, 1),
  A('runclick5k', 'Percussive Maintenance', 'drum', '5,000 slaps in one run. The tower is technically an instrument.', (c) => c.runClicks >= 5_000, 2),
];

// ---- Feats (5) ----
const feats: AchievementDef[] = [
  A('survive30', 'Marathon Goopist', 'medal', 'Keep one run alive for 30 minutes. Hydration is not your problem.', (c) => c.runTime >= 30 * 60 && c.status !== 'dead'),
  A('speedwin', 'Speedgoop', 'flag', 'Win in under 50 minutes. God barely had time to notice you.', (c) => c.status === 'won' && c.runTime < 50 * 60),
  A('rush3', 'Roofline Rush', 'rocket', 'Reach Zone 4: The Roofline within 5 minutes. The shingles never saw it coming.', (c) => c.zone >= 4 && c.runTime <= 5 * 60),
  A('thriftywin', 'Economy Class Ascension', 'ticket', 'Win with fewer than 2,000 slaps. Mostly the goop carried you.', (c) => c.status === 'won' && c.runClicks < 2_000),
  A('kitchenmelt', 'Melted On The Counter', 'pan', 'Collapse without leaving Zone 1. The toaster judged you the whole time.', (c) => (c.status === 'collapsing' || c.status === 'dead') && c.zone === 1),
];

// ---- Producer fleet totals (3) + full set (1) ----
const fleet: AchievementDef[] = [
  A('fleet10', 'Middle Management', 'clipboard', 'Own 10 producers at once. You now attend meetings about goop.', (c) => c.producersTotal >= 10),
  A('fleet100', 'Goop Industrialist', 'crane', 'Own 100 producers at once. The skyline is mostly your fault.', (c) => c.producersTotal >= 100),
  A('fleet500', 'Vertical Monopoly', 'tower', 'Own 500 producers at once. Antitrust regulators melted first.', (c) => c.producersTotal >= 500),
  A('fullset', 'One Of Everything', 'puzzle', 'Own every producer type at once, Squeeze Bottle included.', (c) => c.allProducersOwned),
];

/** All 100, in display order. */
export const ACHIEVEMENTS: readonly AchievementDef[] = [
  ...clicks,
  ...zones,
  ...combo,
  ...producers,
  ...fleet,
  ...goopTotals,
  ...gps,
  ...tiers,
  ...runUps,
  ...feats,
  ...puddles,
  ...heights,
  ...essence,
  ...meta,
  ...wins,
];

export const ACHIEVEMENT_BY_ID: Readonly<Record<string, AchievementDef>> = Object.fromEntries(
  ACHIEVEMENTS.map((a) => [a.id, a]),
);

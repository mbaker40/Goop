/**
 * achievements.ts — 100 achievements (PLAN §7), data-driven. 100 is the Steam per-app cap, so the
 * board is already store-shaped. Each achievement grants +0.5% goop/sec (balance.achievements) —
 * small, permanent, Cookie-Clicker style.
 *
 * Conditions are pure predicates over an AchievementCtx snapshot (built by sim/achievements.ts
 * from the live Game) so the whole system stays deterministic and testable. Flavor must be funny
 * (CLAUDE.md style rule) — if a name could appear in a serious game, rename it.
 */

export interface AchievementCtx {
  // Lifetime (meta) —
  totalClicks: number;
  wins: number;
  puddles: number;
  lifetimeGe: number;
  bestMeters: number;
  metaLevelsTotal: number;
  // Current run —
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
  icon: string;
  flavor: string;
  test: (c: AchievementCtx) => boolean;
}

const A = (id: string, name: string, icon: string, flavor: string, test: (c: AchievementCtx) => boolean): AchievementDef => ({
  id,
  name,
  icon,
  flavor,
  test,
});

// ---- Lifetime clicks (6) ----
const clicks: AchievementDef[] = [
  A('click1', 'First Splat', '👏', 'You slapped the goop. The goop remembers.', (c) => c.totalClicks >= 1),
  A('click100', 'Palm Warmer', '🖐️', '100 lifetime slaps. The goop considers this flirting.', (c) => c.totalClicks >= 100),
  A('click1k', 'Do Not Lick', '👅', '1,000 lifetime slaps. Please also do not lick.', (c) => c.totalClicks >= 1_000),
  A('click10k', 'Carpal Goopnel', '🤕', '10,000 lifetime slaps. Your wrist files a complaint.', (c) => c.totalClicks >= 10_000),
  A('click100k', 'The Hundred-Thousand Hand Slap', '🐙', '100,000 lifetime slaps. Octopi take notes.', (c) => c.totalClicks >= 100_000),
  A('click1m', 'One In A Million (Slaps)', '🌟', '1,000,000 lifetime slaps. The goop got you a card.', (c) => c.totalClicks >= 1_000_000),
];

// ---- Producer collections: 10 producers × own 1 / 50 / 100 / 400 (40) ----
interface ProdMeta {
  id: string;
  icon: string;
  short: string;
  first: string; // flavor for owning the first one
}
const PRODS: ProdMeta[] = [
  { id: 'dripper', icon: '💧', short: 'Dripper', first: 'It drips. That is all it does. It is enough.' },
  { id: 'intern', icon: '🧑‍💼', short: 'Intern', first: 'They asked about dental. You laughed together. Only you laughed.' },
  { id: 'cannon', icon: '💥', short: 'Cannon', first: 'OSHA has not approved this. OSHA has not been told.' },
  { id: 'union', icon: '👷', short: 'Union Crew', first: 'They demand breaks. The breaks are goop.' },
  { id: 'goopcopter', icon: '🚁', short: 'Goopcopter', first: 'It should not fly. It flies out of spite.' },
  { id: 'reactor', icon: '☢️', short: 'Reactor', first: 'The manual is one page. The page says "no".' },
  { id: 'singularity', icon: '🕳️', short: 'Singularity', first: 'Physics called. You let it go to voicemail.' },
  { id: 'mother', icon: '💗', short: 'Goop Mother', first: 'She is proud of you. This is new for you.' },
  { id: 'pipeline', icon: '🌀', short: 'Pipeline', first: 'Alternate-you is furious. Alternate-you can cope.' },
  { id: 'bottle', icon: '🧴', short: 'Squeeze Bottle', first: 'It is exactly what it sounds like, at a scale it should not be.' },
];
const PROD_TIERS: { n: number; label: (s: string) => string; flavor: (s: string) => string }[] = [
  { n: 1, label: (s) => `My First ${s}`, flavor: () => '' /* per-producer flavor used */ },
  { n: 50, label: (s) => `${s} Enthusiast`, flavor: (s) => `50 ${s}s. "Enthusiast" is the polite word.` },
  { n: 100, label: (s) => `${s} Cartel`, flavor: (s) => `100 ${s}s. Authorities describe the operation as "moist".` },
  { n: 400, label: (s) => `${s} Post-Scarcity`, flavor: (s) => `400 ${s}s. Economists have stopped calling back.` },
];
const producers: AchievementDef[] = PRODS.flatMap((p) =>
  PROD_TIERS.map((t) =>
    A(
      `own_${p.id}_${t.n}`,
      t.label(p.short),
      p.icon,
      t.n === 1 ? p.first : t.flavor(p.short),
      (c) => (c.producersOwned[p.id] ?? 0) >= t.n,
    ),
  ),
);

// ---- Zones reached (6) ----
const zones: AchievementDef[] = [
  A('zone2', 'Ceiling? Never Met Her', '🏠', 'Reach Zone 2. The attic was not ready.', (c) => c.zone >= 2),
  A('zone3', 'Suburban Menace', '🏘️', 'Reach Zone 3. The HOA is drafting a letter.', (c) => c.zone >= 3),
  A('zone4', 'Cloud Loiterer', '☁️', 'Reach Zone 4. A jet honked at you.', (c) => c.zone >= 4),
  A('zone5', 'Orbital Goopware', '🛰️', 'Reach Zone 5. The astronaut gave a thumbs-up. He gets it.', (c) => c.zone >= 5),
  A('zone6', 'Deep Space Slime', '🌌', 'Reach Zone 6. The goop whales sing of you.', (c) => c.zone >= 6),
  A('zone7', "Knocking On God's Door", '🚪', 'Reach Zone 7. He can hear you squelching.', (c) => c.zone >= 7),
];

// ---- Wins (3) ----
const wins: AchievementDef[] = [
  A('win1', 'PAST GOD', '🏆', 'Win a run. The hand gave a slow thumbs-up.', (c) => c.wins >= 1),
  A('win3', 'Habitual Deity', '👑', 'Win 3 runs. Heaven has installed a doorbell camera.', (c) => c.wins >= 3),
  A('win10', 'Restraining Order (Divine)', '📜', 'Win 10 runs. You are legally required to stay 1 AU away.', (c) => c.wins >= 10),
];

// ---- Puddles / losses (4) ----
const puddles: AchievementDef[] = [
  A('puddle1', 'Puddle Person', '🫠', 'Lose your first run. Every puddle makes you stronger.', (c) => c.puddles >= 1),
  A('puddle5', 'Frequent Flooder', '🌊', 'Melt 5 times. The mop has a name now. It is Gerald.', (c) => c.puddles >= 5),
  A('puddle25', 'Serial Moisturizer', '💦', 'Melt 25 times. Insurance has questions.', (c) => c.puddles >= 25),
  A('puddle100', 'One Hundred Percent Humidity', '🌧️', 'Melt 100 times. At this point it is a lifestyle.', (c) => c.puddles >= 100),
];

// ---- Best height, flavor meters (6) ----
const heights: AchievementDef[] = [
  A('h30', 'Taller Than A Fridge', '🧊', 'Reach 30 m. The fridge is jealous. The fridge says nothing.', (c) => c.bestMeters >= 30),
  A('h500', 'Airspace Violation', '🪁', 'Reach 500 m. Kites now file flight plans around you.', (c) => c.bestMeters >= 500),
  A('h10k', 'Cruising Altitude', '✈️', 'Reach 10 km. Cabin crew, arm doors and cross-check the goop.', (c) => c.bestMeters >= 10_000),
  A('h400k', 'Moonshot Adjacent', '🌙', 'Reach 400,000 km. The Moon pretends not to notice.', (c) => c.bestMeters >= 400_000_000 / 1000),
  A('h1au', 'One Astronomical Unit Of Goop', '☀️', 'Reach 1 AU. The Sun squints at you.', (c) => c.bestMeters >= 1.5e11),
  A('h1e13', 'Measurement Error', '📏', 'Reach 10¹³ m. Scientists assume the instrument is broken.', (c) => c.bestMeters >= 1e13),
];

// ---- Lifetime Goop Essence (5) ----
const essence: AchievementDef[] = [
  A('ge10', 'Essence Of Failure', '🧪', 'Bank 10 lifetime GE. Distilled directly from mistakes.', (c) => c.lifetimeGe >= 10),
  A('ge100', 'Puddle Sommelier', '🍷', 'Bank 100 lifetime GE. "Ah yes, a 2026. Notes of collapse."', (c) => c.lifetimeGe >= 100),
  A('ge1k', 'Essence Hoarder', '🏺', 'Bank 1,000 lifetime GE. It is not a problem if it is progress.', (c) => c.lifetimeGe >= 1_000),
  A('ge25k', 'Goop Trust Fund', '💼', 'Bank 25,000 lifetime GE. Your puddles have a financial advisor.', (c) => c.lifetimeGe >= 25_000),
  A('ge250k', 'Essence Baron', '🎩', 'Bank 250,000 lifetime GE. You own the concept of melting.', (c) => c.lifetimeGe >= 250_000),
];

// ---- Meta levels total (4) ----
const meta: AchievementDef[] = [
  A('meta1', 'Slightly Permanent', '🔧', 'Buy your first permanent upgrade. It survives the puddle. You will not.', (c) => c.metaLevelsTotal >= 1),
  A('meta10', 'Build Different', '🏗️', '10 permanent upgrade levels. The goop respects the grind.', (c) => c.metaLevelsTotal >= 10),
  A('meta25', 'Meta Goopling', '🧬', '25 permanent upgrade levels. You are becoming the tower.', (c) => c.metaLevelsTotal >= 25),
  A('meta50', 'Foreverware', '♾️', '50 permanent upgrade levels. Death is now a minor inconvenience.', (c) => c.metaLevelsTotal >= 50),
];

// ---- Run upgrades owned in one run (3) ----
const runUps: AchievementDef[] = [
  A('runup3', 'Window Shopper No More', '🛍️', 'Own 3 upgrades in one run. The economy thanks you.', (c) => c.runUpgradesOwned >= 3),
  A('runup8', 'Kitted Out', '🎒', 'Own 8 upgrades in one run. The tower has accessories.', (c) => c.runUpgradesOwned >= 8),
  A('runup12', 'Full Send Loadout', '🧰', 'Own every upgrade in one run. NASA is still asking about your hand.', (c) => c.runUpgradesOwned >= 12),
];

// ---- Tier upgrades in one run (3) ----
const tiers: AchievementDef[] = [
  A('tier5', 'Twice As Nice', '📈', 'Buy 5 ×2 boosts in one run. Multiplication: discovered.', (c) => c.tierUpgradesOwned >= 5),
  A('tier15', 'Exponential Intent', '🚀', 'Buy 15 ×2 boosts in one run. The graph looks illegal.', (c) => c.tierUpgradesOwned >= 15),
  A('tier30', 'Doubling Down Down Down', '♊', 'Buy 30 ×2 boosts in one run. Your calculator shows a skull.', (c) => c.tierUpgradesOwned >= 30),
];

// ---- Run lifetime goop, log10 (4) ----
const goopTotals: AchievementDef[] = [
  A('goop1k', 'Thousandaire (Goop)', '💰', 'Earn 1,000 goop in one run. Liquid assets. Literally.', (c) => c.lifetimeGoopLog10 >= 3),
  A('goop1m', 'Goop Millionaire', '💎', 'Earn 1,000,000 goop in one run. Forbes declines to cover it.', (c) => c.lifetimeGoopLog10 >= 6),
  A('goop1b', 'Gooponaire', '🏦', 'Earn 1e9 goop in one run. The bank requests you stop visiting.', (c) => c.lifetimeGoopLog10 >= 9),
  A('goop1t', 'GDP Of Goop', '🌍', 'Earn 1e12 goop in one run. Small nations send trade delegations.', (c) => c.lifetimeGoopLog10 >= 12),
];

// ---- GPS reached, log10 (4) ----
const gps: AchievementDef[] = [
  A('gps10', 'Ten A Second', '⏱️', 'Reach 10 goop/sec. The faucet is proud.', (c) => c.gpsLog10 >= 1),
  A('gps1k', 'Kilogoop Per Second', '⚡', 'Reach 1,000 goop/sec. The SI committee is uneasy.', (c) => c.gpsLog10 >= 3),
  A('gps100k', 'Industrial Ooze Complex', '🏭', 'Reach 100,000 goop/sec. The pipeline hums a work song.', (c) => c.gpsLog10 >= 5),
  A('gps10m', 'Goop Hose Untethered', '🌋', 'Reach 10,000,000 goop/sec. It cannot be shut off. Nobody asked to.', (c) => c.gpsLog10 >= 7),
];

// ---- Combo + per-run clicks (3) ----
const combo: AchievementDef[] = [
  A('comboMax', 'Maximum Momentum', '🔥', 'Max out the slap combo. Your hand is a renewable resource.', (c) => c.comboMaxed),
  A('runclick500', 'Warm Palms', '🧤', '500 slaps in one run. The goop knows your handprint.', (c) => c.runClicks >= 500),
  A('runclick5k', 'Percussive Maintenance', '🥁', '5,000 slaps in one run. The tower is technically an instrument.', (c) => c.runClicks >= 5_000),
];

// ---- Feats (5) ----
const feats: AchievementDef[] = [
  A('survive30', 'Marathon Goopist', '🏃', 'Keep one run alive for 30 minutes. Hydration is not your problem.', (c) => c.runTime >= 30 * 60 && c.status !== 'dead'),
  A('speedwin', 'Speedgoop', '⏰', 'Win in under 50 minutes. God barely had time to notice you.', (c) => c.status === 'won' && c.runTime < 50 * 60),
  A('rush3', 'Zone 3 Speedrun', '🏁', 'Reach Zone 3 within 5 minutes. The suburbs never saw it coming.', (c) => c.zone >= 3 && c.runTime <= 5 * 60),
  A('thriftywin', 'Economy Class Ascension', '🎫', 'Win with fewer than 2,000 slaps. Mostly the goop carried you.', (c) => c.status === 'won' && c.runClicks < 2_000),
  A('kitchenmelt', 'Melted On The Counter', '🍳', 'Collapse without leaving Zone 1. The toaster judged you the whole time.', (c) => (c.status === 'collapsing' || c.status === 'dead') && c.zone === 1),
];

// ---- Producer fleet totals (3) + full set (1) ----
const fleet: AchievementDef[] = [
  A('fleet10', 'Middle Management', '📋', 'Own 10 producers at once. You now attend meetings about goop.', (c) => c.producersTotal >= 10),
  A('fleet100', 'Goop Industrialist', '🏗️', 'Own 100 producers at once. The skyline is mostly your fault.', (c) => c.producersTotal >= 100),
  A('fleet500', 'Vertical Monopoly', '🗼', 'Own 500 producers at once. Antitrust regulators melted first.', (c) => c.producersTotal >= 500),
  A('fullset', 'One Of Everything', '🧩', 'Own every producer type at once, Squeeze Bottle included.', (c) => c.allProducersOwned),
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

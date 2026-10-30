/* Badge definitions and checks. Pure, no DOM: each test reads the state and stats only. The game asks
   checkBadges() what is newly earned and hands those to the achievements adapter (src/platform), which
   keeps the local shelf today and will mirror to Steam later. Ids are permanent: never rename one. */
import { FEEDERS, UPGRADES, STAGES } from './econ.js';
import { EVENTS } from './events.js';
import { PERKS, perksOwned, perksTotal } from './prestige.js';
import { SUN, totalCaught } from './stats.js';
import { MOOD_IDS } from './mood.js';

const own = (s, id) => s.own[FEEDERS.findIndex(f => f.id === id)] || 0;
const feeders = s => s.own.reduce((a, b) => a + b, 0);
const mutations = s => UPGRADES.filter(u => u.kind === 'all' && s.ups[u.id]).length;

export const BADGES = [
  // feeding by hand
  { id: 'feed1',      name: 'Here, Have a Spoonful', blurb: 'Feed the goop for the first time. It liked it.',            test: (s, st) => st.feeds >= 1 },
  { id: 'feed100',    name: 'Spoon Enthusiast',      blurb: '100 feeds by hand. Your wrist has opinions.',                 test: (s, st) => st.feeds >= 100 },
  { id: 'feed1k',     name: 'One Thousand Spoons',   blurb: '1,000 feeds by hand. Nobody asked you to.',                   test: (s, st) => st.feeds >= 1000 },
  { id: 'feed10k',    name: 'Wrist of Steel',        blurb: '10,000 feeds by hand. Please see a doctor.',                  test: (s, st) => st.feeds >= 10000 },
  { id: 'capped',     name: 'Easy, Tiger',           blurb: 'Feed faster than the goop can swallow. It just stares.',      test: (s, st) => st.cappedClicks >= 1 },
  // the shop
  { id: 'feeder1',    name: 'Delegation',            blurb: 'Buy your first feeder. Let someone else do the dripping.',   test: (s, st) => st.feedersBought >= 1 },
  { id: 'interns10',  name: 'Internship Programme',  blurb: 'Ten interns with spoons. None of them are paid.',             test: s => own(s, 'intern') >= 10 },
  { id: 'feeders100', name: 'Middle Management',     blurb: 'A hundred feeders at once. Someone should make a chart.',    test: s => feeders(s) >= 100 },
  { id: 'spoon',      name: 'Better Cutlery',        blurb: 'Buy the Bigger Spoon. Science marches on.',                   test: s => !!s.ups.spoon },
  { id: 'mut5',       name: 'Mostly Mutation',       blurb: 'Own five Mutations in one run. It has a lot of eyes now.',  test: s => mutations(s) >= 5 },
  { id: 'sps1m',      name: 'Industrial Scale',      blurb: 'Reach a million slop a second. The lab is now a factory.',  test: (s, st) => st.peakSps >= 1e6 },
  // stages
  { id: 'stage2',     name: 'Off the Table',         blurb: 'The goop outgrows the lab table. Nobody wipes it down.',     test: (s, st) => s.stage >= 1 },
  { id: 'stage3',     name: 'Lunch Is Served',       blurb: 'The goop eats the building. Then it eyes the city.',         test: (s, st) => s.stage >= 2 },
  { id: 'stage4',     name: 'Continental Breakfast', blurb: 'The city is gone. The Earth looks like a snack.',            test: (s, st) => s.stage >= 3 },
  { id: 'stage5',     name: 'Planet-Sized',          blurb: 'Heavier than the Earth. Gravity is now its problem.',        test: (s, st) => s.stage >= 4 },
  { id: 'stage6',     name: 'Star Eater',            blurb: 'Heavier than Jupiter. The Sun is getting nervous.',          test: (s, st) => s.stage >= 5 },
  { id: 'sun',        name: 'Total Eclipse',         blurb: 'Eat the Sun and finish Act 1. Permanently.',                                   test: (s, st) => st.wins >= 1 },
  { id: 'fast',       name: 'Fast Food',             blurb: 'Eat the Sun within 30 minutes of starting a run.',           test: (s, st) => st.bestStageAt[SUN] != null && st.bestStageAt[SUN] <= 1800 },
  { id: 'nointerns',  name: 'HR Has Questions',      blurb: 'Reach Jupiter without hiring a single intern.',              test: s => s.stage >= 5 && own(s, 'intern') === 0 },
  // Act 2: the universe
  { id: 'stage8',     name: 'Nursery Crimes',        blurb: 'Reach the Nebula Nibbler. The baby stars never stood a chance.', test: s => s.stage >= 7 },
  { id: 'stage9',     name: 'It Bites Back',         blurb: 'Reach the Black Hole Buffet. The buffet is also eating.',        test: s => s.stage >= 8 },
  { id: 'stage11',    name: 'Signed For',            blurb: 'Reach Andromeda Delivery. Nobody ordered it.',                    test: s => s.stage >= 10 },
  { id: 'stage14',    name: 'Immeasurable Heaven',   blurb: 'Reach Laniakea, our home supercluster. Was our home.',          test: s => s.stage >= 13 },
  { id: 'toaster',    name: 'Judged',                blurb: 'Reach Eating the Nothing. The toaster saw everything.',           test: s => s.stage >= 15 },
  { id: 'oldfriend',  name: 'Old Friend',            blurb: 'Reach Beyond the Horizon and wave at the scientist.',             test: s => s.stage >= 17 },
  { id: 'stage20',    name: 'The Fourth Wall',       blurb: 'Reach the last stage. The goop has noticed you.',                 test: s => s.stage >= 19 },
  { id: 'soundtoggle', name: 'Ate the Sound Toggle', blurb: 'Watch the goop swallow a button. It still works, somehow.',      test: s => !!(s.miles && s.miles['w-sound']) },
  { id: 'universe',   name: 'Eat the Rest',          blurb: 'Press the last button. There is nothing left.',                  test: (s, st) => st.universes >= 1 },
  { id: 'watched',    name: 'Watched the Whole Thing', blurb: 'Sit through the ending without skipping a second.',            test: (s, st) => st.cutsceneSeen >= 1 },
  { id: 'rewatch',    name: 'Second Helping',        blurb: 'Watch the ending again from the trophy shelf.',                   test: (s, st) => st.cutsceneReplays >= 1 },
  { id: 'bigbang',    name: 'Let There Be Goop',     blurb: 'Become the new universe. Start again, bigger.',                   test: (s, st) => st.bigBangs >= 1 },
  { id: 'sps1dc',     name: 'Cosmic Plumbing',       blurb: 'Reach a decillion slop a second. The pipes are galaxies.',      test: (s, st) => st.peakSps >= 1e33 },
  // milestones and moods
  { id: 'mile1',      name: 'Small Victories',       blurb: 'Pass your first milestone. Coffee machines count.',              test: (s, st) => st.milestones >= 1 },
  { id: 'mile50',     name: 'Crumb Collector',       blurb: 'Pass fifty milestones, across every run.',                        test: (s, st) => st.milestones >= 50 },
  { id: 'hungry',     name: 'Feed Me',               blurb: 'Leave the goop hungry for a bit. It noticed.',                    test: (s, st) => (st.moods.hungry || 0) >= 1 },
  { id: 'smug',       name: 'Insufferable',          blurb: 'See the goop looking smug after a hop.',                          test: (s, st) => (st.moods.smug || 0) >= 1 },
  { id: 'moodring',   name: 'Mood Ring',             blurb: 'See every one of the goop\'s six moods.',                       test: (s, st) => MOOD_IDS.every(m => (st.moods[m] || 0) >= 1) },
  // events
  { id: 'event1',     name: "Don't Drink That",      blurb: 'Catch your first event.',                                     test: (s, st) => totalCaught(st) >= 1 },
  { id: 'streak10',   name: 'Steady Hands',          blurb: 'Catch ten events in a row without letting one get away.',    test: (s, st) => st.bestStreak >= 10 },
  { id: 'event100',   name: 'Vial Collector',        blurb: 'Catch a hundred events. The shelf is getting crowded.',      test: (s, st) => totalCaught(st) >= 100 },
  { id: 'alltypes',   name: 'Full Spice Rack',       blurb: 'Catch every kind of event at least once.',                   test: (s, st) => EVENTS.every(e => (st.caught[e.id] || 0) >= 1) },
  { id: 'gamblewin',  name: 'Feeling Lucky',         blurb: 'Win a gamble. Do not let it go to your head.',               test: (s, st) => st.gambleWins >= 1 },
  { id: 'gamblelose', name: 'The House Always Wins', blurb: 'Lose a gamble. The goop will lick the floor.',               test: (s, st) => st.gambleLosses >= 1 },
  { id: 'inspector',  name: 'Nothing to See Here',   blurb: 'Survive an inspector by showing him the door.',              test: (s, st) => (st.caught.inspector || 0) >= 1 },
  { id: 'frozen',     name: 'Code Violation',        blurb: 'Let an inspector finish his form. Ten very long seconds.',  test: (s, st) => (st.missed.inspector || 0) >= 1 },
  { id: 'rival',      name: 'Not Today, Gary',       blurb: 'Chase off the rival scientist before he gets to the bank.',  test: (s, st) => (st.caught.rival || 0) >= 1 },
  // hops and Star Dust
  { id: 'hop1',       name: 'New Neighbourhood',     blurb: 'Hop to the next star. Bring snacks.',                         test: (s, st) => st.hops >= 1 },
  { id: 'hop5',       name: 'Frequent Flyer',        blurb: 'Hop five times. The goop has a loyalty card.',               test: (s, st) => st.hops >= 5 },
  { id: 'perk1',      name: 'Stardust Shopper',      blurb: 'Spend Star Dust on a perk.',                                  test: s => perksOwned(s) >= 1 },
  { id: 'perkall',    name: 'Fully Loaded',          blurb: 'Own every level of every perk. There is nothing left to buy.', test: s => perksOwned(s) >= perksTotal() },
  // around the lab
  { id: 'offline',    name: 'It Ate While You Slept', blurb: 'Come back to find the goop fed itself.',                    test: (s, st) => st.offlineReturns >= 1 },
  { id: 'tourist',    name: 'Tourist',               blurb: 'Peek at every stage. Spoilers.',                              test: (s, st) => STAGES.every((_, k) => st.peeked[k]) },
  { id: 'backup',     name: 'Backup Plan',           blurb: 'Copy your save somewhere safe. Very responsible.',           test: (s, st) => st.exports >= 1 },
];
export const BADGE_BY_ID = Object.fromEntries(BADGES.map(b => [b.id, b]));

// Ids of badges whose test passes and that `has(id)` says are not earned yet.
export function checkBadges(s, st, has) {
  const out = [];
  for (const b of BADGES) if (!has(b.id) && b.test(s, st)) out.push(b.id);
  return out;
}
export { PERKS };

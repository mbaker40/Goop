/* Badge definitions and checks. Pure, no DOM: each test reads the state and stats only. The game asks
   checkBadges() what is newly earned and hands those to the achievements adapter (src/platform), which
   keeps the local shelf today and will mirror to Steam later. Ids are permanent: never rename one. */
import { FEEDERS, UPGRADES, STAGES, SUN_STAGE } from './econ.js';
import { EVENTS } from './events.js';
import { PERKS, perksOwned, perksOwnedIn, perksTotal } from './prestige.js';
import { SUN, totalCaught } from './stats.js';
import { MOOD_IDS } from './mood.js';
import { LEGENDS, LEGEND_AT } from './legends.js';

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
  // perkall meant the whole tree when the tree was only Act 1; it still means the Act 1 tree, so nobody loses it
  { id: 'perkall',    name: 'Fully Loaded',          blurb: 'Own every level of every Act 1 perk.',                         test: s => perksOwnedIn(s, 1) >= perksTotal(1) },
  { id: 'perkall2',   name: 'Nothing Left to Buy',   blurb: 'Own every level of every perk, Act 2 included. Truly.',         test: s => perksOwned(s) >= perksTotal() },
  // around the lab
  { id: 'offline',    name: 'It Ate While You Slept', blurb: 'Come back to find the goop fed itself.',                    test: (s, st) => st.offlineReturns >= 1 },
  { id: 'tourist',    name: 'Tourist',               blurb: 'Peek at every stage. Spoilers.',                              test: (s, st) => STAGES.every((_, k) => st.peeked[k]) },
  { id: 'burp',       name: 'Excuse You',            blurb: 'Come back to the lab and watch the goop burp.',                test: (s, st) => st.burps >= 1 },
  { id: 'daily1',     name: 'Daily Special',         blurb: 'Finish a daily goop: eat the Sun with today\'s twist.',     test: (s, st) => st.dailyDone >= 1 },
  { id: 'share1',     name: 'Show and Tell',         blurb: 'Make a share card of your goop.',                              test: (s, st) => st.shares >= 1 },
  { id: 'backup',     name: 'Backup Plan',           blurb: 'Copy your save somewhere safe. Very responsible.',           test: (s, st) => st.exports >= 1 },
  // phase 4: odd jobs. Specific, discoverable things; the flags are set by the game (main.js) when they happen.
  { id: 'nomiss',     name: 'Nobody Gets Past',      blurb: 'Hop after a whole run in which every visitor (three or more) was shooed.', test: (s, st) => !!st.flags.cleanRun },
  { id: 'gamble5',    name: 'Hot Streak',            blurb: 'Win five gambles in a row. The goop is starting to believe.',            test: (s, st) => st.bestGambleStreak >= 5 },
  { id: 'buzzer',     name: 'Buzzer Beater',         blurb: 'Catch an event with less than a second to spare.',                         test: (s, st) => st.lastSecond >= 1 },
  { id: 'nomut',      name: 'Au Naturel',            blurb: 'Eat the Sun from a fresh dish without buying a single Mutation.',        test: s => s.stage >= SUN_STAGE && (s.startStage | 0) < SUN_STAGE && mutations(s) === 0 },
  { id: 'replay3',    name: 'Director\'s Cut',       blurb: 'Watch the ending three more times from the trophy shelf.',              test: (s, st) => st.cutsceneReplays >= 3 },
  { id: 'mutesound',  name: 'Silent Snack',          blurb: 'Let the goop eat the sound toggle while the sound is off. It did not notice.', test: (s, st) => !!st.flags.muteEat },
  { id: 'handsdaily', name: 'Hands-On Experience',   blurb: 'Finish a daily goop on a Hands On day. Your wrist filed a complaint.', test: (s, st) => !!st.flags.dailyHands },
  { id: 'zerohop',    name: 'Pocket Lint',           blurb: 'Hop to the next star with exactly zero slop to spend.',                   test: (s, st) => !!st.flags.zeroHop },
  { id: 'nofeed',     name: 'Look, No Hands',        blurb: 'Reach Downtown from a fresh dish without feeding the goop by hand.',     test: s => s.stage >= 2 && (s.startStage | 0) === 0 && (s.feeds | 0) === 0 },
  { id: 'refund',     name: 'Buyer\'s Remorse',      blurb: 'Catch a black-hole hiccup and get your money back.',                      test: (s, st) => (st.caught.blackhole || 0) >= 1 },
  { id: 'wormhole',   name: 'Shortcut',              blurb: 'Catch a wormhole. Your feeders are very confused.',                         test: (s, st) => (st.caught.wormhole || 0) >= 1 },
  { id: 'duelwin',    name: 'Click-Off Champion',    blurb: 'Out-click the rival goop. It wants a rematch.',                             test: (s, st) => !!st.flags.duelWin },
  { id: 'duellose',   name: 'Out-Clicked',           blurb: 'Lose a click-off to the rival goop. It will not stop talking about it.', test: (s, st) => !!st.flags.duelLose },
  { id: 'darkvial',   name: 'Dark Horse',            blurb: 'Drink a dark-matter vial without knowing what was in it.',               test: (s, st) => (st.caught.darkvial || 0) >= 1 },
  { id: 'comet',      name: 'Make a Wish',           blurb: 'Catch a comet shower. Wish for more slop.',                                 test: (s, st) => (st.caught.comet || 0) >= 1 },
  { id: 'taxman',     name: 'Tax Dodger',            blurb: 'Shoo the cosmic tax collector before he gets his cut.',                   test: (s, st) => (st.caught.taxman || 0) >= 1 },
  { id: 'pigeon',     name: 'Bird Brained',          blurb: 'Let the lab pigeon get away with your slop.',                              test: (s, st) => (st.missed.pigeon || 0) >= 1 },
  { id: 'deephop',    name: 'Deep Diver',            blurb: 'Hop from stage 17 or deeper, without eating the rest first.',            test: (s, st) => !!st.flags.deepHop },
  { id: 'bonus100',   name: 'Twice the Goop',        blurb: 'Build your hop bonus up to +100%.',                                          test: s => (s.hopBonus || 0) >= 1 },
  { id: 'pity',       name: 'Pity Party',            blurb: 'Let three events in a row get away, and get a free boost out of it.',   test: (s, st) => !!st.flags.pity },
  { id: 'nightowl',   name: 'Night Shift',           blurb: 'Feed the goop between two and five in the morning. It is always awake.',  test: (s, st) => !!st.flags.night },
  { id: 'capped100',  name: 'Calm Down',             blurb: 'Feed faster than the goop can swallow a hundred times.',                   test: (s, st) => st.cappedClicks >= 100 },
  { id: 'burp10',     name: 'Connoisseur of Burps',  blurb: 'Come back and watch the goop burp ten times.',                              test: (s, st) => st.burps >= 10 },
  { id: 'daily7',     name: 'Regular',               blurb: 'Finish seven daily goops. The goop saves you a seat.',                     test: (s, st) => st.dailyDone >= 7 },
  { id: 'speedsun',   name: 'Drive-Thru',            blurb: 'Eat the Sun within five minutes of starting a run.',                       test: (s, st) => st.bestStageAt[SUN] != null && st.bestStageAt[SUN] <= 300 },
];
// Feeder legends (legends.js): a badge for each feeder at 100 and at 500, one for any 500, one for 100 of
// every feeder in an act. Ids are permanent, like the rest.
const ownOf = (s, id) => s.own[FEEDERS.findIndex(f => f.id === id)] || 0;
const nameOf = id => FEEDERS.find(f => f.id === id).name;
const ACTS = [FEEDERS.filter(f => f.stage < SUN_STAGE).map(f => f.id), FEEDERS.filter(f => f.stage >= SUN_STAGE).map(f => f.id)];
for (const l of LEGENDS) {
  BADGES.push({ id: 'leg1-' + l.id, group: 'legends', name: l.t1, blurb: 'Own ' + LEGEND_AT[0] + ' of the ' + nameOf(l.id) + ' at once.', test: s => ownOf(s, l.id) >= LEGEND_AT[0] });
  BADGES.push({ id: 'leg2-' + l.id, group: 'legends', name: l.t2, blurb: 'Own ' + LEGEND_AT[1] + ' of the ' + nameOf(l.id) + ' at once. Legendary.', test: s => ownOf(s, l.id) >= LEGEND_AT[1] });
}
BADGES.push({ id: 'leg500any', group: 'legends', name: 'Living Legend', blurb: 'Own ' + LEGEND_AT[1] + ' of any one feeder. Somebody has to count them.', test: s => LEGENDS.some(l => ownOf(s, l.id) >= LEGEND_AT[1]) });
BADGES.push({ id: 'leg100act', group: 'legends', name: 'Full House', blurb: 'Own ' + LEGEND_AT[0] + ' of every feeder in one act, all at once.', test: s => ACTS.some(ids => ids.every(id => ownOf(s, id) >= LEGEND_AT[0])) });

// Shelf groups, so a phone can show 130 badges a section at a time. A badge's own `group` wins.
export const BADGE_GROUPS = [
  { id: 'feeding', name: 'Feeding and the shop', ids: ['feed1', 'feed100', 'feed1k', 'feed10k', 'capped', 'feeder1', 'interns10', 'feeders100', 'spoon', 'mut5', 'sps1m', 'sps1dc', 'capped100', 'nofeed'] },
  { id: 'stages', name: 'Stages', ids: ['stage2', 'stage3', 'stage4', 'stage5', 'stage6', 'sun', 'fast', 'nointerns', 'stage8', 'stage9', 'stage11', 'stage14', 'toaster', 'oldfriend', 'stage20', 'soundtoggle', 'universe', 'watched', 'rewatch', 'bigbang', 'speedsun', 'nomut', 'replay3', 'mutesound'] },
  { id: 'events', name: 'Events', ids: ['event1', 'streak10', 'event100', 'alltypes', 'gamblewin', 'gamblelose', 'inspector', 'frozen', 'rival', 'gamble5', 'buzzer', 'refund', 'wormhole', 'duelwin', 'duellose', 'darkvial', 'comet', 'taxman', 'pigeon', 'pity', 'nomiss'] },
  { id: 'hops', name: 'Hops and Star Dust', ids: ['hop1', 'hop5', 'perk1', 'perkall', 'perkall2', 'zerohop', 'deephop', 'bonus100'] },
  { id: 'lab', name: 'Around the lab', ids: ['mile1', 'mile50', 'hungry', 'smug', 'moodring', 'offline', 'tourist', 'burp', 'daily1', 'share1', 'backup', 'handsdaily', 'nightowl', 'burp10', 'daily7'] },
  { id: 'legends', name: 'Feeder legends', ids: [] },
];
for (const b of BADGES) if (!b.group) b.group = (BADGE_GROUPS.find(g => g.ids.includes(b.id)) || BADGE_GROUPS[4]).id;
export function badgesIn(group) { return BADGES.filter(b => b.group === group); }
export const BADGE_BY_ID = Object.fromEntries(BADGES.map(b => [b.id, b]));

// Ids of badges whose test passes and that `has(id)` says are not earned yet.
export function checkBadges(s, st, has) {
  const out = [];
  for (const b of BADGES) if (!has(b.id) && b.test(s, st)) out.push(b.id);
  return out;
}
export { PERKS };

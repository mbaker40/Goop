/* Feeder legends: what happens when the player owns 100, then 500, copies of one feeder. Data-driven, one
   entry per feeder, pure and without imports, so econ.js can read the multipliers without a cycle.
   At 100 a feeder earns a title, works LEGEND_MULT[1] times harder, and turns up in the scene. At 500 it
   earns a second title, works LEGEND_MULT[2] times harder in all (on top of the first), and plays a short
   set piece. Both thresholds show on the shop row as a hint once the player has passed HINT_FROM. */

export const LEGEND_AT = [100, 500];
export const LEGEND_MULT = [1, 2, 6];        // by legend level: none, 100 owned (x2), 500 owned (x3 more)
export const HINT_FROM = 50;

// id: the feeder. t1/t2: the titles. say1/say2: the goop's one-liner. piece: the 500 set piece's
// choreography (rain, wave, convoy, solo, storm, parade); line: its caption.
const L = (id, t1, say1, t2, say2, piece, line) => ({ id, t1, say1, t2, say2, piece, line });
export const LEGENDS = [
  L('pipette',  'The Drip Chorus',       'A hundred pipettes, all dripping in time. Beautiful.', 'The Pipette Cathedral', 'It is raining pipettes. Hallelujah.', 'rain', 'Five hundred pipettes fall from the ceiling, dripping all the way down.'),
  L('intern',   'The Intern Horde',      'A hundred interns. None of them know my name.', 'The Intern Union', 'The interns unionised. They want spoons with handles.', 'wave', 'Five hundred interns do a stadium wave, spoons up.'),
  L('chute',    'Taco Tuesday Forever',  'A hundred chutes. Every day is Tuesday now.', 'The Great Cafeteria', 'The chutes have formed a choir. It sounds like lunch.', 'storm', 'Five hundred lunch trays spin round the goop like a tornado.'),
  L('truck',    'The Bin Brigade',       'A hundred garbage trucks. The neighbours are thrilled.', 'The Endless Convoy', 'Beep beep. That is the convoy saying hello.', 'convoy', 'Five hundred garbage trucks form a convoy and circle the goop.'),
  L('pipeline', 'Pipe Dreams',           'A hundred pipelines. The landfill is feeling empty.', 'The Plumbing Opera', 'The pipes are singing. Mostly in the key of gurgle.', 'parade', 'A parade of pipeline sections marches past, gurgling.'),
  L('siphon',   'Salt Lick',             'A hundred siphons. The oceans are suspiciously low.', 'Tidal Appetite', 'I drank the tides. They were salty.', 'rain', 'Five hundred siphons rain seawater over the goop.'),
  L('grinder',  'Gravel Gourmet',        'A hundred grinders. Mountains are just crunchy salad.', 'The Alpine Blender', 'Every mountain is now smooth. You are welcome.', 'storm', 'A storm of grinders whirls round the goop, spitting gravel.'),
  L('lasso',    'Rodeo Season',          'A hundred moon lassos. Yee, and indeed, haw.', 'The Lasso Storm', 'Every moon in the sky is roped. Every one.', 'storm', 'A lasso storm: five hundred ropes whirl round the goop at once.'),
  L('cracker',  'Nutcracker Suite',      'A hundred planet crackers. Mars was just the start.', 'The Planet Piñata', 'Hit it again. Planets fall out every time.', 'rain', 'Planets crack and rain down like piñata sweets.'),
  L('straw',    'Bendy Straw Band',      'A hundred star straws. Slurp in harmony.', 'The Slurp Solo', 'One straw takes the spotlight. It slurps a sun.', 'solo', 'The star straw takes the stage for a slurp solo.'),
  L('dyson',    'Sock Drawer of Stars',  'A hundred Dyson funnels. Every star wears a sock.', 'The Dyson Sphere Choir', 'The stars hum inside their socks. It is soothing.', 'parade', 'A parade of sock-wrapped stars bobs past the goop.'),
  L('comet',    'Snowball Fight',        'A hundred comet conveyors. Duck.', 'The Comet Carousel', 'The comets go round and round. Wheee.', 'convoy', 'Five hundred comets circle the goop like a carousel.'),
  L('spork',    'Cutlery Drawer',        'A hundred event horizon sporks. No way back for anyone.', 'The Spork Orchestra', 'The sporks are conducting. I do not know the song.', 'wave', 'A wall of sporks does the wave, tines up.'),
  L('gulper',   'Gulp Squad',            'A hundred galaxy gulpers. Gulp. Gulp. Gulp.', 'The Gulping Galaxy', 'Gulp in unison. It shakes the universe.', 'storm', 'Five hundred gulpers whirl round the goop, mouths open.'),
  L('towrope',  'Tug of Galaxies',       'A hundred tow ropes. Everything is coming closer.', 'The Great Haul', 'Heave. Ho. A galaxy cluster comes for dinner.', 'convoy', 'Tow ropes circle the goop, hauling galaxies behind them.'),
  L('wormhole', 'Shortcut Society',      'A hundred wormholes. Every road leads to my mouth.', 'The Wormhole Maze', 'I can taste the far side of the universe.', 'rain', 'Wormholes open across the sky and snacks fall through.'),
  L('compactor','Tidy Cubes',            'A hundred cluster compactors. Everything is a neat cube.', 'The Cube Cathedral', 'A tower of cubes. Delicious geometry.', 'parade', 'Galaxy cubes march past in tidy rows.'),
  L('magnet',   'Everything Comes Here', 'A hundred great attractor magnets. I am very attractive.', 'The Pull of the Goop', 'Everything sticks to me now. Even you.', 'storm', 'Magnets whirl round the goop, pulling the scenery in.'),
  L('filfork',  'Noodle Night',          'A hundred filament forks. Twirl, slurp, twirl.', 'The Spaghetti Universe', 'The whole cosmic web, one long noodle.', 'wave', 'Filament forks wave in a long line, twirling noodles.'),
  L('vacstraw', 'Nothing Doing',         'A hundred vacuum straws. I am eating the nothing.', 'The Great Hoover', 'I hoovered up the gaps between things.', 'solo', 'The vacuum straw takes a solo and slurps the dark.'),
  L('conladle', 'Ladle Gang',            'A hundred light cone ladles. Scoop.', 'The Last Scoop', 'I scooped up everything the light has reached.', 'rain', 'Ladles rain from the sky, scooping light on the way down.'),
  L('hopper',   'Horizon Hoppers Club',  'A hundred horizon hoppers. Very rude, very fast.', 'Beyond the Beyond', 'They fetched something from past the edge. It was crunchy.', 'convoy', 'Hoppers circle the goop, bounding over the horizon.'),
  L('whisk',    'Stiff Peaks',           'A hundred dark matter whisks. Whisk, whisk.', 'The Dark Meringue', 'The dark matter is whipped. The universe is dessert.', 'storm', 'Whisks whirl round the goop, whipping the dark into peaks.'),
];
export const LEGEND_BY_ID = Object.fromEntries(LEGENDS.map(l => [l.id, l]));

// 0: none, 1: 100 owned, 2: 500 owned.
export function legendLevel(owned) { return owned >= LEGEND_AT[1] ? 2 : owned >= LEGEND_AT[0] ? 1 : 0; }
export function legendMult(owned) { return LEGEND_MULT[legendLevel(owned)]; }
export function legendTitle(id, owned) { const l = LEGEND_BY_ID[id], lv = legendLevel(owned); return !l || !lv ? '' : lv === 2 ? l.t2 : l.t1; }
// The hint on the shop row once the player has passed HINT_FROM: how far to the next threshold. '' before.
export function legendHint(owned) {
  if (owned < HINT_FROM) return '';
  if (owned < LEGEND_AT[0]) return owned + ' of ' + LEGEND_AT[0] + ': something happens at ' + LEGEND_AT[0];
  if (owned < LEGEND_AT[1]) return owned + ' of ' + LEGEND_AT[1] + ': something bigger happens at ' + LEGEND_AT[1];
  return '';
}
// Legends reached that `seen` (a map of 'id:level' keys) does not have yet, in order: [{ id, level, legend }].
// The game marks each one seen when it celebrates it (or, for a save loaded with them, quietly).
export function newLegends(ids, own, seen) {
  const out = [];
  ids.forEach((id, i) => { const lv = legendLevel(own[i] || 0); for (let k = 1; k <= lv; k++) if (!(seen && seen[id + ':' + k])) out.push({ id, level: k, legend: LEGEND_BY_ID[id] }); });
  return out;
}

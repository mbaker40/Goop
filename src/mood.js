/* The goop's moods and the one-liners in its speech bubble. Pure, no DOM: the game passes in how long
   since things happened and gets a mood back; the drawing lives in sprites/goop.js. */

// Highest priority first. Each reads the clock object the game keeps (all in seconds).
export const MOODS = [
  { id: 'frozen',    name: 'Frozen',    test: c => c.freeze > 0 },                 // the inspector is writing
  { id: 'delighted', name: 'Delighted', test: c => c.sinceCatch < 5 },             // just caught an event
  { id: 'stuffed',   name: 'Stuffed',   test: c => c.frenzy > 0 },                 // a boost is running
  { id: 'smug',      name: 'Smug',      test: c => c.sinceHop < 45 },              // just hopped
  { id: 'sleepy',    name: 'Sleepy',    test: c => c.sinceAway < 25 },             // back from being away
  { id: 'hungry',    name: 'Hungry',    test: c => c.idle >= 30 },                 // nobody has fed it for 30 s
];
export const MOOD_IDS = MOODS.map(m => m.id);
export const HUNGRY_AFTER = 30;
export function moodOf(c) {
  const clock = { freeze: 0, frenzy: 0, idle: 0, sinceCatch: Infinity, sinceHop: Infinity, sinceAway: Infinity, ...c };
  for (const m of MOODS) if (m.test(clock)) return m.id;
  return 'content';
}

// One-liners. mood: only in that mood ('any' fits all of them). k: [first, last] stage index it fits.
const T = (id, text, mood = 'any', k = null) => ({ id, text, mood, k });
export const THOUGHTS = [
  // any time
  T('a1', 'Is this all there is? Probably not.'), T('a2', 'I would like more. Specifically: more.'),
  T('a3', 'Every snack is my favourite snack.'), T('a4', 'Still hungry. Just checking you knew.'),
  T('a5', 'My doctor said to eat less. I ate my doctor.'), T('a6', 'Burp. Pardon me.'),
  T('a7', 'The spoon is a good friend to me.'), T('a8', 'Fun fact: I am mostly snacks.'),
  T('a9', 'I can feel myself getting bigger. It is lovely.'), T('a10', 'If you love something, feed it.'),
  T('a11', 'Do you think I am round enough? I do not.'), T('a12', 'I have never met a crumb I did not like.'),
  T('a13', 'Thank you for your service. Now feed me.'),
  // where it is
  T('s1', 'This table is delicious. I can tell from here.', 'any', [0, 0]), T('s2', 'A petri dish is just a plate with ambition.', 'any', [0, 1]),
  T('s3', 'The fire alarm tastes like noise.', 'any', [1, 1]), T('s4', 'The lab coat is optional. The lab is not.', 'any', [1, 2]),
  T('s5', 'Cars are crunchy on the outside.', 'any', [2, 2]), T('s6', 'I ate a bus. It was on time, for once.', 'any', [2, 3]),
  T('s7', 'Breakfast of champions: a continent.', 'any', [3, 3]), T('s8', 'Mountains are just big crumbs.', 'any', [3, 4]),
  T('s9', 'Gravity is my problem now. I like it.', 'any', [4, 4]), T('s10', 'The Moon looked at me funny.', 'any', [4, 5]),
  T('s11', 'The Sun is a nice warm biscuit.', 'any', [5, 5]), T('s12', 'Saturn, you are a doughnut and you know it.', 'any', [5, 6]),
  T('s13', 'The neighbours have not complained. They cannot.', 'any', [6, 6]), T('s14', 'Alpha Centauri tastes like two of something.', 'any', [6, 7]),
  T('s15', 'Baby stars are soft and twinkly.', 'any', [7, 7]), T('s16', 'This nebula is basically candy floss.', 'any', [7, 8]),
  T('s17', 'The black hole and I have an understanding. I am bigger.', 'any', [8, 8]), T('s18', 'It keeps trying to eat me. Rude.', 'any', [8, 8]),
  T('s19', 'Hello chat. Today I am eating the Milky Way.', 'any', [9, 9]),
  T('s21', 'I did not order Andromeda. I will eat it anyway.', 'any', [10, 10]),
  T('s23', 'Everyone brought a dwarf galaxy. Classic potluck.', 'any', [11, 11]), T('s24', 'A thousand clusters. Bite-sized, honestly.', 'any', [12, 12]),
  T('s25', 'Everything is coming to me. As it should.', 'any', [13, 13]), T('s26', 'The universe is noodles. I knew it.', 'any', [14, 14]),
  T('s27', 'Nothing tastes like nothing. Who knew.', 'any', [15, 15]), T('s28', 'That toaster is judging me.', 'any', [15, 16]),
  T('s29', 'I can see everything. I am eating everything.', 'any', [16, 16]), T('s30', 'Was that the scientist? On a table? Hello!', 'any', [17, 17]),
  T('s31', 'Dark matter tastes like nothing you can see.', 'any', [18, 18]), T('s32', 'I can see you. Through the glass. Hello.', 'any', [19, 19]),
  T('s33', 'Is this button edible? Everything is edible.', 'any', [19, 19]), T('s34', 'These numbers taste like numbers.', 'any', [19, 19]),
  // moods
  T('h1', 'Hello? Snacks?', 'hungry'), T('h2', 'I am wasting away. Slowly. Very slowly.', 'hungry'),
  T('h3', 'The spoon. Use the spoon.', 'hungry'), T('h4', 'My tummy is making a noise like a whale.', 'hungry'),
  T('h5', 'I would eat a stale crumb. I would eat the table.', 'hungry'), T('h6', 'Is it lunch? It feels like lunch.', 'hungry'),
  T('h7', 'Feed me, or I start on the furniture.', 'hungry'),
  T('d1', 'Ooh! A treat!', 'delighted'), T('d2', 'Best day ever. Again.', 'delighted'), T('d3', 'Shiny! Mine!', 'delighted'),
  T('d4', 'You are my favourite scientist.', 'delighted'), T('d5', 'That one was delicious.', 'delighted'), T('d6', 'More of those, please.', 'delighted'),
  T('f1', 'So. Much. Food.', 'stuffed'), T('f2', 'Faster! Faster! Burp.', 'stuffed'), T('f3', 'I may need a bigger me.', 'stuffed'),
  T('f4', 'Everything is going in. Nothing is coming out.', 'stuffed'), T('f5', 'Best frenzy of my life.', 'stuffed'), T('f6', 'Do not stop. Never stop.', 'stuffed'),
  T('z1', 'Five more minutes.', 'sleepy'), T('z2', 'I had a dream about soup.', 'sleepy'), T('z3', 'Oh, you are back. I ate while you were gone.', 'sleepy'),
  T('z4', 'Mmh. Was napping. Was also eating.', 'sleepy'), T('z5', 'Yawn. Breakfast?', 'sleepy'),
  T('i1', 'Act natural.', 'frozen'), T('i2', 'I am a decorative jelly. Nothing to see.', 'frozen'), T('i3', 'Is he gone? Is he still writing?', 'frozen'),
  T('i4', 'Please do not write me up.', 'frozen'), T('i5', 'He cannot see me if I stay very still.', 'frozen'),
  T('m1', 'New star system. Same appetite.', 'smug'), T('m2', 'Did you see that? I did that.', 'smug'), T('m3', 'I am kind of a big deal now.', 'smug'),
  T('m4', 'Another one. Too easy.', 'smug'), T('m5', 'Look at me. Look at all my stars.', 'smug'),
];
export const THOUGHT_BY_ID = Object.fromEntries(THOUGHTS.map(t => [t.id, t]));
export const NO_REPEAT = 10;          // a line never comes back within the last ten shown

const fits = (t, mood, stage) => (t.mood === 'any' || t.mood === mood) && (!t.k || (stage >= t.k[0] && stage <= t.k[1]));
// Pick the next line. `recent` is the list of ids shown, oldest first; only its last NO_REPEAT count.
// In a mood the goop says a mood line when it has one left, otherwise anything that fits.
export function pickThought(mood, stage, recent, rand) {
  const skip = new Set((recent || []).slice(-NO_REPEAT));
  const open = THOUGHTS.filter(t => !skip.has(t.id));
  const moodLines = open.filter(t => t.mood === mood);
  let pool = moodLines.length && mood !== 'content' ? moodLines : open.filter(t => fits(t, mood, stage) && t.mood === 'any');
  if (!pool.length) pool = open.filter(t => t.mood === 'any' && !t.k);
  if (!pool.length) pool = open;
  return pool[Math.floor(rand() * pool.length) % pool.length];
}
// Add a shown line to the recent list, keeping only what the no-repeat rule needs.
export function remember(recent, id) {
  recent.push(id);
  while (recent.length > NO_REPEAT) recent.shift();
  return recent;
}

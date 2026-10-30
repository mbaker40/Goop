/* Words and numbers. Pure, no DOM. */
// Short scale names up to a decillion (1e33), then goop units: a Burp is 1e36, a Belly 1e39, and so on.
// The longest readout is "99.9 Bellies", which still fits the slop tag on a phone.
export const SHORT = ['K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];
export const GOOP_UNITS = [['Burp', 'Burps'], ['Belly', 'Bellies'], ['Gulp', 'Gulps'], ['Feast', 'Feasts'], ['Gorge', 'Gorges'], ['Glut', 'Gluts']];
const three = n => (n < 10 ? n.toFixed(2) : n < 100 ? n.toFixed(1) : String(Math.floor(n + 1e-9)));
export function fmt(n) {
  if (!Number.isFinite(n)) return n > 0 ? 'Way too much' : '0';
  if (n < 1000) return n < 10 && n % 1 ? n.toFixed(1) : Math.floor(n).toLocaleString('en-US');
  const units = SHORT.length + GOOP_UNITS.length;
  // divide once by an exact power of ten (repeated /1000 drifts: 1e33 would come out as 999.99 No)
  let i = Math.min(units, Math.floor(Math.log10(n) / 3)) - 1;
  if (i >= units - 1 && n >= Math.pow(10, 3 * units + 3)) return n.toExponential(2).replace('+', '');   // past the last Glut
  n = n / Number('1e' + 3 * (i + 1));
  if (n < 1) { n *= 1000; i--; }                     // log10 rounding just under a power of 1000
  const txt = three(n);
  if (i < SHORT.length) return txt + SHORT[i];
  const [one, many] = GOOP_UNITS[i - SHORT.length];
  return txt + ' ' + (txt === '1.00' ? one : many);
}
export const sig = x => x < 10 ? x.toFixed(2) : x < 100 ? x.toFixed(1) : Math.round(x).toLocaleString('en-US');
// Compact for big counts of big things: "502K Suns", "1.50B Suns".
const csig = x => (x < 1e4 ? sig(x) : fmt(x));

// Real units all the way up: grams, kilograms, tonnes, then Moons, Earths, Jupiters, Suns, then galaxies,
// superclusters and whole universes.
export const MASS_UNITS = [[7.35e25, 'Moons'], [5.97e27, 'Earths'], [1.9e30, 'Jupiters'], [1.99e33, 'Suns'], [3e45, 'Milky Ways', 'Milky Way'], [2e48, 'Laniakeas', 'Laniakea'], [1.5e56, 'Universes', 'Universe']];
export function fmtMass(g) {
  if (g < 1e3) return sig(g) + ' g';
  if (g < 1e6) return sig(g / 1e3) + ' kg';
  if (g < 7.35e25) { let t = g / 1e6, i = 0; while (t >= 1e6 || (i > 0 && t >= 1000)) { t /= 1000; i++; } return sig(t) + ['', '', ' million', ' billion', ' trillion', ' quadrillion', ' quintillion'][i] + ' tonnes'; }
  let u = MASS_UNITS[0];
  for (const m of MASS_UNITS) if (g >= m[0]) u = m;
  const n = csig(g / u[0]);
  return n + ' ' + (n === '1.00' && u[2] ? u[2] : u[1]);
}
export const HEAVIER = [[1, 'a paperclip'], [145, 'a baseball'], [4500, 'a house cat'], [1.5e6, 'a family car'], [1.5e8, 'a blue whale'], [1.01e10, 'the Eiffel Tower'], [6e12, 'the Great Pyramid'],
  [2.2e17, "Halley's Comet"], [1.07e19, 'Phobos, the moon of Mars'], [5.1e21, "Earth's atmosphere"], [1.4e24, "all of Earth's oceans"], [7.35e25, 'the Moon'], [6.42e26, 'Mars'], [5.97e27, 'the Earth'], [1.9e30, 'Jupiter'], [1.99e33, 'the Sun'],
  // Act 2: the neighbours, then everything else
  [4.1e33, 'Sirius'], [3.6e34, 'Betelgeuse'], [4e35, 'the heaviest star we know of'], [4e36, 'the Orion Nebula'], [8e39, 'Omega Centauri'], [8.6e39, 'Sagittarius A*'],
  [2e43, 'the Large Magellanic Cloud'], [3e45, 'the Milky Way'], [6e45, 'the Milky Way and Andromeda'], [1e46, 'the Local Group'], [2.4e48, 'the Virgo Cluster'],
  [2e49, 'the Shapley Supercluster'], [2e50, 'Laniakea'], [1e52, 'the Sloan Great Wall'], [1.5e56, 'the observable universe'], [1.5e57, 'ten observable universes'], [1.5e58, 'a hundred observable universes']];
export function heavierThan(g) { let w = HEAVIER[0][1], first = true; for (const [m, n] of HEAVIER) if (g >= m * 1.02) { w = n; first = m === 1 && g < 2; } return (first ? 'About as heavy as ' : 'Heavier than ') + w; }
export function clock(s) { const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60); return (h ? h + ' h ' : '') + (h || m ? m + ' min ' : '') + Math.floor(s % 60) + ' s'; }

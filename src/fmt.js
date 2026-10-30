/* Words and numbers. Pure, no DOM. */
export function fmt(n) {
  if (n < 1000) return n < 10 && n % 1 ? n.toFixed(1) : Math.floor(n).toLocaleString('en-US');
  const u = ['K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx']; let i = -1;
  while (n >= 1000 && i < u.length - 1) { n /= 1000; i++; }
  return (n < 10 ? n.toFixed(2) : n < 100 ? n.toFixed(1) : Math.floor(n)) + u[i];
}
export const sig = x => x < 10 ? x.toFixed(2) : x < 100 ? x.toFixed(1) : Math.round(x).toLocaleString('en-US');
export function fmtMass(g) {                        // real units all the way up: grams, kilograms, tonnes, then Moons, Earths, Jupiters, Suns
  if (g < 1e3) return sig(g) + ' g';
  if (g < 1e6) return sig(g / 1e3) + ' kg';
  if (g < 7.35e25) { let t = g / 1e6, i = 0; while (t >= 1e6 || (i > 0 && t >= 1000)) { t /= 1000; i++; } return sig(t) + ['', '', ' million', ' billion', ' trillion', ' quadrillion', ' quintillion'][i] + ' tonnes'; }
  if (g < 5.97e27) return sig(g / 7.35e25) + ' Moons';
  if (g < 1.9e30) return sig(g / 5.97e27) + ' Earths';
  if (g < 1.99e33) return sig(g / 1.9e30) + ' Jupiters';
  return sig(g / 1.99e33) + ' Suns';
}
export const HEAVIER = [[1, 'a paperclip'], [145, 'a baseball'], [4500, 'a house cat'], [1.5e6, 'a family car'], [1.5e8, 'a blue whale'], [1.01e10, 'the Eiffel Tower'], [6e12, 'the Great Pyramid'],
  [2.2e17, "Halley's Comet"], [1.07e19, 'Phobos, the moon of Mars'], [5.1e21, "Earth's atmosphere"], [1.4e24, "all of Earth's oceans"], [7.35e25, 'the Moon'], [6.42e26, 'Mars'], [5.97e27, 'the Earth'], [1.9e30, 'Jupiter'], [1.99e33, 'the Sun']];
export function heavierThan(g) { let w = HEAVIER[0][1], first = true; for (const [m, n] of HEAVIER) if (g >= m * 1.02) { w = n; first = m === 1 && g < 2; } return (first ? 'About as heavy as ' : 'Heavier than ') + w; }
export function clock(s) { const m = Math.floor(s / 60); return (m ? m + ' min ' : '') + Math.floor(s % 60) + ' s'; }

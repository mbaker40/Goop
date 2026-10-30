/* The goop's looks for Act 2 (stages 7 to 20): colours, eye counts and the extra features each stage
   grows. Same rules as Act 1: flat colour, one shadow shape, thick ink, no gradients on the body. */
import { P, cut, inked, flat, line, ctx, INK, clamp, rng } from '../draw.js';

// base, shade, highlight. Gold, candy floss, black hole, royal blue, magenta, tangerine, mint, sky,
// chartreuse, ghost, coral, deep teal, plum, and finally the colour of the page it is eating.
export const GOOP_ACT2 = [['#ffd23f', '#e0a91a', '#fff3b0'], ['#ff9ad8', '#e066b0', '#ffd6f0'], ['#3a2a5c', '#231838', '#8a72c8'],
  ['#3b6cff', '#2447c4', '#a6c0ff'], ['#e23fd1', '#b01fa3', '#ffb0f5'], ['#ffb36b', '#e08a3a', '#ffe0bd'], ['#5fe8a8', '#2fbf82', '#c4ffe4'],
  ['#49c6f5', '#2096c9', '#c2efff'], ['#d7f03c', '#a9c41c', '#f3ffb0'], ['#cfc8ee', '#a39bcf', '#f4f1ff'], ['#ff7a59', '#d9512f', '#ffc4b3'],
  ['#1f9f98', '#13706b', '#8fe8de'], ['#6a2a70', '#46164c', '#c47fc8'], ['#fff3d6', '#e3cfa3', '#ffffff']];
export const EYE_COUNT_ACT2 = [11, 4, 1, 13, 2, 6, 8, 12, 3, 1, 14, 5, 2, 2];
export const EYE_SCALE = [1, 1, 1, 1, 1, 1, 1, 1, 1.5, 1, 1.15, 1, 1, 1, 1, 1.4, 1, 1, 1.2, 1.25];
export const EYES_MORE = [[.66, -.34, .08], [-.6, -.36, .08], [.8, -.08, .07], [-.82, -.14, .07], [.3, -.84, .065]];

const SPARK = (px, py, q) => P.poly([[px, py - q * 2.4], [px + q * .6, py - q * .6], [px + q * 2.4, py], [px + q * .6, py + q * .6], [px, py + q * 2.4], [px - q * .6, py + q * .6], [px - q * 2.4, py], [px - q * .6, py - q * .6]]);
function sparkles(x, cy, r, tt, n, cols, seed) {
  const sr = rng(seed);
  for (let i = 0; i < n; i++) {
    const px = x + (sr() * 1.8 - .9) * r, py = cy + (sr() * 1.8 - .9) * r, tw = .5 + .5 * Math.sin(tt * 3 + i * 1.9), q = (2 + sr() * 4) * (.6 + .4 * tw) * r / 150;
    flat(SPARK(px, py, q), cols[i % cols.length], .5 + .5 * tw);
  }
}
function spiral(x, y, r, tt, col, arms = 2) {               // a little spiral galaxy, as dots
  for (let a = 0; a < arms; a++) for (let i = 0; i < 16; i++) {
    const u = i / 16, an = a * Math.PI * 2 / arms + u * 4.2 + tt * .4, rr = r * (.12 + u * .88);
    flat(P.circ(x + Math.cos(an) * rr, y + Math.sin(an) * rr * .62, Math.max(1.2, r * .07 * (1 - u * .6))), col, .9 - u * .5);
  }
  flat(P.circ(x, y, r * .16), '#fff3b0', .9);
}
function collar(x, cy, r, tt, lw, col, n, inner, outer) {
  const c = [];
  for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + tt * .15; const rr = r * (i % 2 ? inner : outer + .04 * Math.sin(tt * 3 + i)); c.push([x + Math.cos(a) * rr, cy + Math.sin(a) * rr]); }
  cut(P.poly(c), col, { lw: lw * .8, d: 1 });
}

// Behind the body.
export function drawAct2Body(k, x, cy, r, tt, lw, col) {
  if (k === 6) collar(x, cy, r, tt, lw, '#fff3b0', 32, 1.06, 1.24);                      // a corona: it is a star now
  if (k === 8 || k === 10) {                                                               // the back half of a tilted ring
    const R = P.ell(x, cy, r * 1.62, r * .42, -.18);
    inked(R, k === 8 ? '#ff9a1f' : '#ffd6f0', lw * .8);
    flat(P.ell(x, cy, r * 1.28, r * .26, -.18), k === 8 ? '#231838' : '#b01fa3');
  }
  if (k === 17) { ctx.setLineDash([10, 12]); ctx.beginPath(); ctx.arc(x, cy, r * 1.22, 0, 7); ctx.strokeStyle = 'rgba(255,243,214,.7)'; ctx.lineWidth = 4; ctx.stroke(); ctx.setLineDash([]); }
  if (k === 18) for (const f of [1.3, 1.5]) { ctx.beginPath(); ctx.arc(x, cy, r * f + (tt % 1) * 6, 0, 7); ctx.strokeStyle = 'rgba(196,127,200,.45)'; ctx.lineWidth = 3; ctx.stroke(); }
}

// Inside the body (already clipped to it): sparkles, galaxies, webs and so on, plus the usual bubbles.
export function drawAct2Inside(k, x, cy, r, tt, col, shade, light) {
  switch (k) {
    case 6: sparkles(x, cy, r, tt, 14, ['#ffffff', '#ff9a1f'], 21); break;
    case 7: sparkles(x, cy, r, tt, 24, ['#ffffff', '#56e1ff', '#fff3b0'], 22);
      for (const [dx, dy, s] of [[-.4, .2, .3], [.3, .4, .25], [.1, -.1, .2]]) flat(P.circ(x + dx * r, cy + dy * r, s * r), '#ffd6f0', .45); break;
    case 8: sparkles(x, cy, r, tt, 10, ['#8a72c8'], 23);
      ctx.save(); ctx.beginPath(); ctx.rect(x - r * 2, cy, r * 4, r * 2); ctx.clip();          // the front half of the accretion ring
      ctx.beginPath(); ctx.ellipse(x, cy, r * 1.62, r * .42, -.18, 0, Math.PI); ctx.strokeStyle = '#ff9a1f'; ctx.lineWidth = r * .08; ctx.stroke(); ctx.restore(); break;
    case 9: spiral(x - r * .1, cy + r * .2, r * .62, tt, '#fff3b0', 3); sparkles(x, cy, r, tt, 8, ['#ffffff'], 24); break;
    case 10: spiral(x - r * .35, cy + r * .3, r * .32, tt, '#ffd6f0'); spiral(x + r * .4, cy + r * .1, r * .3, -tt, '#fff3b0'); break;
    case 11: case 15: {
      const n = k === 11 ? 9 : 3, sr = rng(30 + k);
      for (let i = 0; i < n; i++) flat(P.circ(x + (sr() * 1.5 - .75) * r, cy + (sr() * 1.3 - .45) * r, (.04 + sr() * .07) * r), k === 11 ? '#fff3b0' : light, .7);
      break;
    }
    case 12: sparkles(x, cy, r, tt, 22, ['#ffffff', '#c4ffe4'], 25); break;
    case 13: for (let i = 0; i < 6; i++) {                                                  // flow lines, all heading to the middle
      const a = i / 6 * Math.PI * 2 + tt * .2; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * r * .95, cy + Math.sin(a) * r * .95);
      ctx.quadraticCurveTo(x + Math.cos(a + .8) * r * .55, cy + Math.sin(a + .8) * r * .55, x, cy + r * .05); ctx.strokeStyle = light; ctx.lineWidth = Math.max(2, r * .025); ctx.stroke();
    } break;
    case 14: {                                                                              // the web, eaten and showing
      const sr = rng(41), nodes = Array.from({ length: 9 }, () => [x + (sr() * 1.7 - .85) * r, cy + (sr() * 1.6 - .8) * r]);
      for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) if ((i * 7 + j * 3) % 4 === 0) line([nodes[i], nodes[j]], light, Math.max(2, r * .02));
      for (const [nx, ny] of nodes) flat(P.circ(nx, ny, r * .035 * (1 + .3 * Math.sin(tt * 3 + nx))), '#ffffff', .9);
      break;
    }
    case 16: { const sr = rng(52); for (let i = 0; i < 40; i++) flat(P.circ(x + (sr() * 2 - 1) * r, cy + (sr() * 2 - 1) * r, (.03 + sr() * .06) * r), i % 3 ? light : '#56b4ff', .55); break; }
    case 17: sparkles(x, cy, r, tt, 12, ['#ffffff', '#fff3b0'], 26); break;
    case 18: sparkles(x, cy, r, tt, 16, ['#c47fc8', '#ffffff'], 27); break;
    case 19: for (let i = -5; i < 6; i++) line([[x - r * 1.2, cy + i * r * .16], [x + r * 1.2, cy + i * r * .16]], 'rgba(73,191,245,.45)', Math.max(1.5, r * .01));   // ruled paper
      line([[x - r * .62, cy - r * 1.2], [x - r * .62, cy + r * 1.2]], 'rgba(255,95,143,.5)', Math.max(1.5, r * .012)); break;
  }
  for (let i = 0; i < 4; i++) {                                                             // bubbles drifting up, as in Act 1
    const u = ((tt * .13 + i * .27) % 1), bx = x + (i - 1.5) * r * .3 + Math.sin(tt * 2 + i) * r * .03, by = cy + r * .6 - u * r * 1.4;
    ctx.globalAlpha = Math.sin(u * Math.PI) * .8; ctx.beginPath(); ctx.arc(bx, by, r * (.03 + .015 * (i % 3)), 0, 7); ctx.strokeStyle = light; ctx.lineWidth = Math.max(1.5, r * .014); ctx.stroke(); ctx.globalAlpha = 1;
  }
}
export { clamp };

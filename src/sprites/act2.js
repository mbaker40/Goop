import { P, cut, inked, flat, box, line, label, ctx, reduce, INK, PAPER, clamp, lerp } from '../draw.js';
import { sciHead } from './scientist.js';

/* ---------- Act 2 characters ---------- */

// The Judgmental Toaster. Chrome, two slots, one eyebrow permanently raised. lookX/lookY: what it judges.
export function toaster(x, y, s, t, o = {}) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  const pop = clamp(o.pop || 0, 0, 1);
  for (const sx of [-26, 12]) { cut(P.rect(sx, -78 - pop * 34, 30, 40, 8), '#e8b46a', { lw: 3.5, d: .5 }); flat(P.rect(sx + 5, -74 - pop * 34, 20, 8, 3), '#c9853a'); }
  cut(P.rect(-62, -62, 124, 82, 22), '#c9cfdf', { lw: 4.5, d: 1 });
  flat(P.rect(-50, -54, 18, 62, 8), '#ffffff', .55);
  for (const sx of [-30, 8]) inked(P.rect(sx, -66, 22, 8, 3), INK, 2);
  cut(P.rect(60, -40, 18, 10, 3), INK, { lw: 3, d: .3 });
  const lx = o.lookX == null ? 0 : clamp(o.lookX, -1, 1), ly = o.lookY == null ? 0 : clamp(o.lookY, -1, 1);
  for (const [ex, brow] of [[-20, -.25], [22, .35]]) {
    inked(P.ell(ex, -22, 13, 11), '#ffffff', 3);
    flat(P.circ(ex + lx * 5, -21 + ly * 4, 5), INK);
    line([[ex - 13, -40 - brow * 14], [ex + 13, -40 + brow * 14]], INK, 4.5);
  }
  line([[-12, 4], [14, 2]], INK, 4);
  inked(P.ell(-36, 24, 12, 6), INK, 2); inked(P.ell(36, 24, 12, 6), INK, 2);
  ctx.restore();
}

// A goop that grew up to be a scientist: wobbly body, goggles, a lab coat and a tiny spoon.
// Feet at (x, y). fling 0..1 swings the spoon arm; wave > 0 waves it instead.
export function goopScientist(x, y, s, t, fling = 1, wave = 0, col = ['#8fdc2f', '#62ae1c', '#cdf680']) {
  ctx.save(); ctx.translate(x, y + (reduce ? 0 : Math.sin(t * 2.4) * 2.5 * s)); ctx.scale(s, s);
  const wb = reduce ? 0 : Math.sin(t * 3);
  inked(P.ell(-18, -4, 22, 9), col[1], 3); inked(P.ell(20, -4, 22, 9), col[1], 3);
  cut(P.poly([[-46, -150], [48, -150], [64, -10], [-62, -10]]), '#f7f4ff', { lw: 3.5, d: .8 });
  line([[2, -146], [4, -14]], INK, 2.5);
  for (const by of [-118, -88, -58]) flat(P.circ(13, by, 4), INK);
  inked(P.rect(-42, -100, 24, 26, 3), '#f7f4ff', 2.5); line([[-36, -110], [-36, -98]], '#22c3b0', 4); line([[-28, -112], [-28, -98]], '#ff5f8f', 4);
  const pts = [];
  for (let i = 0; i < 26; i++) { const a = i / 26 * Math.PI * 2, rr = 62 * (1 + .05 * Math.sin(3 * a + t * 2) + .03 * Math.sin(5 * a - t * 2.6)); pts.push([Math.cos(a) * rr * (1 + wb * .02), -186 + Math.sin(a) * rr * .86]); }
  cut(P.smooth(pts), col[0], { lw: 4.5, d: .6 });
  flat(P.ell(-24, -216, 16, 8, -.6), col[2], .9);
  inked(P.rect(-60, -204, 120, 12, 4), '#3b2a63', 3);
  for (const gx of [-20, 22]) { inked(P.circ(gx, -198, 19), '#8f9bb8', 3.5); inked(P.circ(gx, -198, 13), '#dffcf6', 2.5); flat(P.circ(gx + 4, -197, 5.5), INK); }
  ctx.beginPath(); ctx.arc(2, -168, 18, Math.PI * .2, Math.PI * .8); ctx.strokeStyle = INK; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.stroke();
  const a = wave > 0 ? -1.9 + Math.sin(t * 7) * .45 : -0.95 + Math.sin(clamp(fling, 0, 1) * Math.PI) * 1.25;
  ctx.save(); ctx.translate(40, -138); ctx.rotate(a);
  if (wave <= 0) { line([[70, 0], [104, -2]], INK, 6); line([[70, 0], [104, -2]], '#c9cfdf', 2.5); inked(P.ell(110, -3, 9, 6), '#c9cfdf', 2.5); }
  cut(P.rect(-8, -12, 74, 24, 12), '#f7f4ff', { lw: 3.5, d: .5 });
  inked(P.circ(72, 0, 14), col[0], 3.5);
  ctx.restore();
  ctx.restore();
}

// A tiny human in a tiny lab coat. turn 0: side-on, looking left at its feeder; 1: straight at you.
export function tinyHuman(x, y, s, t, turn = 0, burp = 0) {
  ctx.save(); ctx.translate(x, y + (reduce ? 0 : Math.sin(t * 2) * 1.5 * s)); ctx.scale(s, s);
  inked(P.rect(-14, -30, 10, 30, 3), '#3b2a63', 3); inked(P.rect(4, -30, 10, 30, 3), '#3b2a63', 3);
  cut(P.poly([[-22, -82], [22, -82], [28, -26], [-28, -26]]), '#f7f4ff', { lw: 3.5, d: .6 });
  line([[0, -80], [0, -28]], INK, 2);
  cut(P.circ(0, -106, 26), '#f4c9a0', { lw: 3.5, d: .5 });
  cut(P.poly([[-26, -112], [-20, -132], [0, -136], [22, -130], [26, -112], [10, -122], [-8, -120]]), '#5b4636', { lw: 3, d: .3 });
  const side = 1 - clamp(turn, 0, 1);
  if (turn >= .5) {                                                       // looking right at you
    for (const ex of [-10, 10]) { inked(P.circ(ex, -104, 7.5), '#ffffff', 2.5); flat(P.circ(ex, -103, 3.6), INK); }
    line([[-7, -88], [7, -88]], INK, 3);
  } else {
    for (const ex of [-12, 2]) { inked(P.circ(ex - side * 2, -104, 6), '#ffffff', 2.5); flat(P.circ(ex - side * 4, -104, 3), INK); }
    if (burp > 0) inked(P.ell(-8, -88, 6, 5 * burp), '#4a1030', 2.5);
    else { ctx.beginPath(); ctx.arc(-6, -94, 8, Math.PI * .2, Math.PI * .8); ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.stroke(); }
  }
  ctx.restore();
}

// The original scientist, standing on the stage 1 lab table, drifting through space. Waves.
export function tableRide(x, y, s, t, scientist) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(reduce ? 0 : Math.sin(t * .7) * .06); ctx.scale(s, s);
  cut(P.rect(-150, 0, 300, 60, 6), '#d9772b', { lw: 5, d: 1.2 });
  box(-150, 2, 300, 16, '#f2a154'); line([[-150, 19], [150, 19]], INK, 3);
  for (const lx of [-128, 112]) cut(P.rect(lx, 58, 18, 70, 4), '#b85f1f', { lw: 4, d: .8 });
  inked(P.ell(60, 4, 52, 8), 'rgba(227,250,255,.75)', 3);
  scientist(-40, 2, .62, t, reduce ? 1 : (Math.sin(t * 3) + 1) / 2);
  ctx.restore();
}
export { sciHead, label, PAPER, lerp };

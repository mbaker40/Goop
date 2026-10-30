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

// A tiny human in a tiny lab coat: a person, unmistakably. Hair with a parting, ears, glasses, eyebrows,
// a nose and a mouth; a neck; a coat with lapels, a shirt and tie, buttons and a pocket with a pen; arms
// in sleeves with hands; trousers and shoes. Feet at (x, y), about 160 units tall at s = 1.
// turn 0: three-quarter view, looking left at its feeder; 1: straight at you. open 0..1: mouth open (a
// feed, a burp). squash: the game's feed wobble (positive squashes, negative stretches).
export function tinyHuman(x, y, s, t, turn = 0, open = 0, squash = 0) {
  const SKIN = '#f4c9a0', HAIR = '#5b4636', COAT = '#f7f4ff', PANTS = '#3b2a63';
  ctx.save(); ctx.translate(x, y + (reduce ? 0 : Math.sin(t * 2) * 1.2 * s)); ctx.scale(s * (1 + squash * .08), s * (1 - squash * .1));
  const look = 1 - clamp(turn, 0, 1);                                     // 1: looking left, 0: at you
  // shoes and legs
  for (const d of [-1, 1]) { inked(P.rect(d * 11 - 6, -44, 12, 40, 4), PANTS, 3); cut(P.ell(d * 11 + (d < 0 ? -4 : 4) - look * 3, -3, 12, 6), '#2a1838', { lw: 3, d: .2 }); }
  // the coat: body, lapels over a shirt and tie, buttons, a pocket with a pen
  cut(P.poly([[-22, -102], [22, -102], [27, -40], [-27, -40]]), COAT, { lw: 3.5, d: .6 });
  flat(P.poly([[-8, -102], [8, -102], [0, -78]]), '#bfe3ff');
  inked(P.poly([[-2.5, -98], [2.5, -98], [3.5, -82], [0, -76], [-3.5, -82]]), '#e23f3f', 1.6);
  inked(P.poly([[-12, -102], [-3, -102], [-1, -76], [-9, -86]]), COAT, 2.2); inked(P.poly([[12, -102], [3, -102], [1, -76], [9, -86]]), COAT, 2.2);
  line([[0, -76], [0, -42]], INK, 2);
  for (const by of [-68, -56]) flat(P.circ(4, by, 2.4), INK);
  inked(P.rect(-19, -72, 10, 9, 1.5), COAT, 1.8); line([[-16, -78], [-16, -68]], '#3b6cff', 2.5);
  // arms over the coat: sleeves, cuffs, hands with thumbs (the left one lifted toward its feeder)
  const sway = reduce ? 0 : Math.sin(t * 2.2) * .06;
  for (const d of [-1, 1]) {
    ctx.save(); ctx.translate(d * 21, -98); ctx.rotate(-d * .2 + (d < 0 ? look * .55 : 0) + sway * d);
    cut(P.rect(-6.5, 0, 13, 46, 6), COAT, { lw: 3, d: .3 }); line([[-6.5, 40], [6.5, 40]], INK, 2);
    inked(P.circ(0, 53, 7), SKIN, 2.5); inked(P.ell(-d * 6, 48, 3.2, 5, -d * .5), SKIN, 2);
    ctx.restore();
  }
  // neck and head
  inked(P.rect(-5, -112, 10, 12, 3), SKIN, 2.5);
  for (const d of [-1, 1]) inked(P.ell(d * 21 + look * 3, -130, 4.5, 6.5), SKIN, 2.5);   // ears
  cut(P.ell(look * -2, -132, 20, 22), SKIN, { lw: 3.5, d: .4 });
  // hair: a side parting and a fringe
  const hx = look * -2;
  cut(P.poly([[hx - 21, -134], [hx - 19, -150], [hx - 8, -157], [hx + 8, -157], [hx + 18, -151], [hx + 21, -136], [hx + 14, -146], [hx + 2, -144], [hx - 4, -150], [hx - 10, -143]]), HAIR, { lw: 3, d: .2 });
  // face: eyes look at the feeder, or at you
  const fx = look * -4, px = look * -2.2;
  for (const d of [-1, 1]) {
    const ex = fx + d * 8;
    inked(P.ell(ex, -132, 5.2, 5.6), '#ffffff', 1.8); flat(P.circ(ex + px, -131.5, 2.7), INK); flat(P.circ(ex + px - .9, -132.6, .9), '#ffffff');
    line([[ex - 4.5, -140 - (turn > .5 ? 1.5 : 0)], [ex + 4.5, -141 - (turn > .5 ? 1.5 : 0) + d * .6]], HAIR, 2.2);   // eyebrows (up, when it sees you)
    ctx.beginPath(); ctx.arc(ex, -132, 7.4, 0, Math.PI * 2); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke();  // glasses
  }
  line([[fx - .8, -132], [fx + .8, -132]], INK, 2);                        // the bridge
  ctx.beginPath(); ctx.moveTo(fx - 1 - look * 2, -128); ctx.quadraticCurveTo(fx - 4 - look * 2, -122, fx - look * 2, -121.5); ctx.strokeStyle = INK; ctx.lineWidth = 1.8; ctx.lineCap = 'round'; ctx.stroke();   // nose
  const mx = fx - look * 2, my = -116;
  if (open > .05) { inked(P.ell(mx, my, 4.5 + open * 1.5, 1.5 + open * 4.5), '#4a1030', 1.8); flat(P.ell(mx, my + open * 2, 2.6, open * 1.8), '#ff7aa8'); }
  else if (turn > .5) line([[mx - 4.5, my], [mx + 4.5, my]], INK, 2.2);   // deadpan, at the camera
  else { ctx.beginPath(); ctx.arc(mx, my - 3, 5, Math.PI * .2, Math.PI * .8); ctx.strokeStyle = INK; ctx.lineWidth = 2.2; ctx.stroke(); }
  flat(P.ell(fx - 13, -124, 3.5, 2), '#ff9a9a', .6); flat(P.ell(fx + 13, -124, 3.5, 2), '#ff9a9a', .6);
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

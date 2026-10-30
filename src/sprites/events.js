/* Event sprites: one look per event type, in the same cardboard-cutout style as everything else.
   Every vial hangs on a string like the other props; visitors dangle too (it is a toy theatre). */
import { P, cut, inked, flat, box, line, ctx, reduce, INK, EDGE, PAPER, FONT, clamp } from '../draw.js';

function glow(x, y, t, col) {
  flat(P.circ(x, y, 44 + (reduce ? 0 : 5 * Math.sin(t * 6))), col || '#fff3b0', .32 + (reduce ? 0 : .16 * Math.sin(t * 6)));
}
function liquid(path, x, y, col, t, top) {           // fill the lower part of a glass shape with a sloshing liquid
  ctx.save(); ctx.clip(path); box(x - 40, y + top + (reduce ? 0 : Math.sin(t * 5) * 2), 80, 80, col); ctx.restore();
  ctx.lineWidth = 4; ctx.strokeStyle = INK; ctx.stroke(path);
}

// The original mutagen vial: a conical flask of pink, corked.
function frenzyVial(x, y, t) {
  glow(x, y, t);
  const F = P.poly([[x - 10, y - 36], [x + 10, y - 36], [x + 10, y - 12], [x + 28, y + 26], [x - 28, y + 26], [x - 10, y - 12]]);
  cut(F, '#e8fbff', { lw: 4, d: 1.4 });
  ctx.save(); ctx.clip(F); box(x - 32, y + 2 + (reduce ? 0 : Math.sin(t * 5) * 2), 64, 30, '#ff5f8f'); flat(P.circ(x - 8, y + 14, 4), '#ffc2d6'); flat(P.circ(x + 9, y + 8, 3), '#ffc2d6'); ctx.restore();
  ctx.lineWidth = 4; ctx.strokeStyle = INK; ctx.stroke(F);
  inked(P.rect(x - 12, y - 46, 24, 12, 3), EDGE, 3);
}
// Geyser: a tall test tube of gold, spraying out of the top.
function geyserVial(x, y, t) {
  glow(x, y, t, '#ffe08a');
  for (let i = 0; i < 6; i++) {
    const u = reduce ? i / 6 : (t * 1.4 + i / 6) % 1, sx = x + Math.sin(i * 2.3) * 22 * u, sy = y - 44 - Math.sin(u * Math.PI) * 34;
    inked(P.circ(sx, sy, 5 * (1 - u) + 2), '#ffb01f', 2.5);
  }
  const T = P.rect(x - 13, y - 42, 26, 74, 13);
  cut(T, '#e8fbff', { lw: 4, d: 1.4 });
  liquid(T, x, y, '#ffb01f', t, -14);
  flat(P.rect(x - 7, y - 34, 5, 50, 3), '#ffffff', .6);
}
// Slow drip: a round-bottomed flask of teal, leaking one drop at a time.
function dripVial(x, y, t) {
  glow(x, y, t, '#b8fff4');
  const u = reduce ? .5 : (t * .8) % 1;
  inked(P.ell(x, y + 40 + u * 34, 5, 7), '#22c3b0', 2.5);
  const F = new Path2D(); F.moveTo(x - 9, y - 36); F.lineTo(x + 9, y - 36); F.lineTo(x + 9, y - 14); F.arc(x, y + 8, 26, -1.22, Math.PI + 1.22); F.closePath();
  cut(F, '#e8fbff', { lw: 4, d: 1.4 });
  liquid(F, x, y, '#22c3b0', t, 4);
  inked(P.rect(x - 11, y - 46, 22, 12, 3), EDGE, 3);
}
// Bubbling: a green conical flask, rattling, with bubbles pouring over the top. No cork. Risky.
function bubblingVial(x, y, t) {
  const j = reduce ? 0 : Math.sin(t * 31) * 1.6;
  x += j;
  glow(x, y, t, '#d8ff9a');
  for (let i = 0; i < 5; i++) {
    const u = reduce ? i / 5 : (t * .9 + i / 5) % 1;
    ctx.globalAlpha = 1 - u; inked(P.circ(x + Math.sin(t * 3 + i * 2) * 10, y - 40 - u * 40, 4 + i % 3 * 2), '#cdf680', 2.5); ctx.globalAlpha = 1;
  }
  const F = P.poly([[x - 10, y - 36], [x + 10, y - 36], [x + 10, y - 12], [x + 28, y + 26], [x - 28, y + 26], [x - 10, y - 12]]);
  cut(F, '#e8fbff', { lw: 4, d: 1.4 });
  ctx.save(); ctx.clip(F); box(x - 32, y - 10 + (reduce ? 0 : Math.sin(t * 9) * 3), 64, 40, '#8fdc2f');
  for (let i = 0; i < 4; i++) flat(P.circ(x - 12 + i * 8, y + 18 - ((t * 40 + i * 13) % 26), 3), '#e8ffc8'); ctx.restore();
  ctx.lineWidth = 4; ctx.strokeStyle = INK; ctx.stroke(F);
}
// Mystery: a squat purple bottle with a hand-written question mark on the label.
function mysteryVial(x, y, t) {
  glow(x, y, t, '#e2ccff');
  const B = new Path2D(); B.moveTo(x - 8, y - 34); B.lineTo(x + 8, y - 34); B.lineTo(x + 8, y - 20); B.quadraticCurveTo(x + 24, y - 18, x + 24, y - 4);
  B.lineTo(x + 24, y + 22); B.quadraticCurveTo(x + 24, y + 30, x + 16, y + 30); B.lineTo(x - 16, y + 30); B.quadraticCurveTo(x - 24, y + 30, x - 24, y + 22);
  B.lineTo(x - 24, y - 4); B.quadraticCurveTo(x - 24, y - 18, x - 8, y - 20); B.closePath();
  cut(B, '#e8fbff', { lw: 4, d: 1.4 });
  liquid(B, x, y, '#a268ff', t, -6);
  inked(P.rect(x - 15, y - 2, 30, 22, 3), PAPER, 3);
  ctx.font = '400 20px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = INK; ctx.fillText('?', x, y + 10);
  inked(P.rect(x - 10, y - 44, 20, 12, 3), EDGE, 3);
}

// The lab inspector: grey coat, hat, clipboard, a moustache of disapproval.
function inspector(x, y, t) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(reduce ? 0 : Math.sin(t * 2.2) * .05);
  inked(P.ell(-12, 54, 12, 6), INK, 2); inked(P.ell(12, 54, 12, 6), INK, 2);
  cut(P.poly([[-24, -8], [24, -8], [32, 50], [-32, 50]]), '#8f9bb8', { lw: 4, d: 1.2 });
  line([[0, -6], [0, 48]], INK, 2.5); line([[-10, -8], [0, 10], [10, -8]], INK, 2.5);
  cut(P.circ(0, -28, 20), '#f4c9a0', { lw: 3.5, d: .6 });
  flat(P.circ(-7, -30, 2.6), INK); flat(P.circ(7, -30, 2.6), INK);
  line([[-12, -38], [-3, -35]], INK, 3); line([[12, -38], [3, -35]], INK, 3);
  inked(P.ell(0, -20, 10, 4), '#5b4636', 2);
  inked(P.ell(0, -45, 30, 6), '#5b4636', 3); inked(P.rect(-15, -66, 30, 22, 6), '#5b4636', 3); box(-15, -50, 30, 4, INK);
  ctx.save(); ctx.translate(26, 14); ctx.rotate(.18);
  cut(P.rect(-14, -18, 28, 38, 3), '#b98852', { lw: 3, d: .6 }); inked(P.rect(-10, -12, 20, 28, 2), PAPER, 2);
  for (const ly of [-6, 0, 6]) line([[-6, ly], [6, ly]], INK, 1.6); line([[-6, 11], [-2, 14], [6, 6]], '#ff5f5f', 2);
  inked(P.rect(-6, -21, 12, 6, 2), '#c9cfdf', 2);
  ctx.restore();
  ctx.restore();
}
// The rival scientist: dark coat, darker goggles, a sack with a slop drop on it.
function rival(x, y, t) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(reduce ? 0 : Math.sin(t * 2.6) * .06);
  const sack = new Path2D(); sack.moveTo(-26, -8); sack.quadraticCurveTo(-58, -2, -54, 30); sack.quadraticCurveTo(-46, 48, -24, 40); sack.quadraticCurveTo(-14, 10, -26, -8); sack.closePath();
  cut(sack, '#d9b98a', { lw: 3.5, d: 1 });
  ctx.save(); ctx.translate(-38, 20); ctx.rotate(Math.PI / 4); inked(P.rect(-6, -6, 12, 12, 0), '#ffb01f', 2.5); ctx.restore();
  inked(P.ell(-12, 54, 12, 6), INK, 2); inked(P.ell(12, 54, 12, 6), INK, 2);
  cut(P.poly([[-24, -8], [24, -8], [30, 50], [-30, 50]]), '#3b2a63', { lw: 4, d: 1.2 });
  line([[0, -6], [0, 48]], '#6a59a8', 2.5);
  cut(P.poly([[-20, -40], [-26, -56], [-10, -48], [-4, -62], [6, -48], [18, -58], [20, -40]]), '#2f6b3a', { lw: 3, d: .5 });
  cut(P.circ(0, -28, 20), '#e8c4a0', { lw: 3.5, d: .6 });
  inked(P.rect(-20, -36, 40, 9, 3), INK, 2);
  inked(P.circ(-8, -32, 7), '#2a1838', 2.5); inked(P.circ(8, -32, 7), '#2a1838', 2.5);
  flat(P.circ(-6, -34, 2), '#ff5f5f'); flat(P.circ(10, -34, 2), '#ff5f5f');
  ctx.beginPath(); ctx.arc(2, -18, 8, .2, Math.PI - .6); ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.stroke();
  ctx.restore();
}

const LOOKS = { frenzy: frenzyVial, geyser: geyserVial, drip: dripVial, bubbling: bubblingVial, mystery: mysteryVial, inspector, rival };
export const VISITOR_LOOKS = ['inspector', 'rival'];

// Draw one target of an event, hanging from the top of the scene. Sets tg.px/tg.py for hit testing
// (in scene units, before parallax).
export function drawTarget(tg, ev, t, parX, parY) {
  const sw = reduce ? 0 : Math.sin(t * 2 + ev.seed + tg.opt) * (VISITOR_LOOKS.includes(tg.look) ? 10 : 16);
  const x = tg.x + sw, y = clamp(tg.y, 0, 999) - (1 - Math.min(1, ev.age / .6)) ** 3 * (tg.y + 70);
  tg.px = x - parX * 20; tg.py = y - parY * 10;
  const visitor = VISITOR_LOOKS.includes(tg.look);
  line([[tg.x, -30], [x, y - (visitor ? 66 : 40)]], 'rgba(255,243,214,.75)', 1.8);
  (LOOKS[tg.look] || frenzyVial)(x, y, t);
  return [x, y];
}

// Outlined label in the same style as the floating "+12" numbers.
export function tag(txt, x, y, size, alpha, fill) {
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha = clamp(alpha, 0, 1);
  ctx.font = '400 ' + size + 'px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  ctx.lineWidth = 6; ctx.strokeStyle = INK; ctx.strokeText(txt, x, y); ctx.fillStyle = fill || PAPER; ctx.fillText(txt, x, y);
  ctx.restore();
}

// A little stopwatch: how long a visitor stays before he gets his way.
export function stopwatch(x, y, r, left) {
  inked(P.circ(x, y, r), PAPER, 3);
  if (left > 0) {
    const w = new Path2D(); w.moveTo(x, y); w.arc(x, y, r - 4, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * clamp(left, 0, 1)); w.closePath();
    flat(w, '#ff5f8f');
  }
  inked(P.rect(x - 4, y - r - 7, 8, 6, 2), INK, 2);
}

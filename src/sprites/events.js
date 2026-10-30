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

/* ---------- phase 4 ---------- */
// Lunch bell: a brass hand bell on a ribbon, ringing.
function lunchBell(x, y, t) {
  glow(x, y, t, '#ffe9a8');
  const sw = reduce ? 0 : Math.sin(t * 14) * .22;
  ctx.save(); ctx.translate(x, y - 34); ctx.rotate(sw);
  inked(P.rect(-5, -14, 10, 18, 4), '#b85f1f', 3);
  const B = new Path2D(); B.moveTo(-8, 2); B.quadraticCurveTo(-10, 30, -28, 52); B.lineTo(28, 52); B.quadraticCurveTo(10, 30, 8, 2); B.closePath();
  cut(B, '#ffc93f', { lw: 4, d: 1.2 });
  flat(P.ell(-8, 30, 4, 14, .3), '#fff3b0', .8);
  inked(P.circ(0 + sw * 20, 58, 7), '#b85f1f', 3);
  ctx.restore();
  if (!reduce) for (const d of [-1, 1]) { const u = (t * 2) % 1; ctx.globalAlpha = 1 - u; line([[x + d * (38 + u * 12), y - 6], [x + d * (48 + u * 12), y - 14]], INK, 3); line([[x + d * (40 + u * 12), y + 6], [x + d * (52 + u * 12), y + 6]], INK, 3); ctx.globalAlpha = 1; }
}
// Lab pigeon: grey, smug, one foot up, a crumb of slop in its beak.
function pigeon(x, y, t) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(reduce ? 0 : Math.sin(t * 3) * .06);
  line([[-6, 30], [-8, 48]], '#ff8f5f', 4); line([[8, 30], [12, 42 + (reduce ? 0 : Math.sin(t * 6) * 4)]], '#ff8f5f', 4);
  cut(P.poly([[-40, -2], [-58, 10], [-50, 22], [-30, 16]]), '#7d86a6', { lw: 3.5, d: .6 });
  cut(P.ell(0, 10, 36, 26), '#a3abc8', { lw: 4, d: 1.1 });
  flat(P.ell(4, 20, 22, 12), '#c9cfdf');
  cut(P.ell(-8, 8, 22, 14, -.3), '#8f98b8', { lw: 3, d: .3 });
  flat(P.ell(22, -10, 12, 9), '#7fd6b0', .9); flat(P.ell(18, -6, 10, 7), '#c08ad8', .7);
  cut(P.circ(26, -22, 15), '#a3abc8', { lw: 3.5, d: .5 });
  inked(P.circ(30, -26, 5), '#ffffff', 2); flat(P.circ(31, -26, 2.4), '#ff8f5f');
  cut(P.poly([[38, -24], [52, -19], [38, -15]]), '#e8b46a', { lw: 2.5, d: .2 });
  inked(P.circ(54, -18, 4), '#8fdc2f', 2);
  ctx.restore();
}
// Comet shower: three comets with long tails, the biggest one in front.
function cometShower(x, y, t) {
  glow(x, y, t, '#c2efff');
  for (const [dx, dy, r, ph] of [[-30, -26, 8, 1], [26, -40, 6, 2], [0, 4, 16, 0]]) {
    const wob = reduce ? 0 : Math.sin(t * 4 + ph) * 3, cx = x + dx, cy = y + dy + wob;
    const T = P.poly([[cx - r * .7, cy - r * .7], [cx - r * 5, cy - r * 3.2], [cx - r * 4, cy - r * 1.6], [cx - r * 5.2, cy - r * .8], [cx + r * .2, cy + r * .9]]);
    flat(T, '#8fe8ff', .55); line([[cx, cy], [cx - r * 4.4, cy - r * 2.6]], '#ffffff', Math.max(2, r * .25));
    cut(P.circ(cx, cy, r), '#e3faff', { lw: Math.max(2.5, r * .25), d: .6 });
    flat(P.circ(cx - r * .3, cy - r * .3, r * .35), '#ffffff', .9);
  }
}
// Black-hole hiccup: a little black hole in an orange ring, mid-hiccup, a coin popping out.
function blackHole(x, y, t) {
  const hic = reduce ? .5 : Math.max(0, Math.sin(t * 5)) ** 6;
  inked(P.ell(x, y, 44, 14, -.2), '#ff9a1f', 3.5);
  cut(P.circ(x, y, 26 + hic * 5), '#140b24', { lw: 4, d: 1.2 });
  ctx.save(); ctx.beginPath(); ctx.rect(x - 60, y, 120, 40); ctx.clip();
  ctx.beginPath(); ctx.ellipse(x, y, 44, 14, -.2, 0, Math.PI); ctx.strokeStyle = '#ffc93f'; ctx.lineWidth = 6; ctx.stroke(); ctx.restore();
  for (const ex of [-9, 9]) { inked(P.circ(x + ex, y - 6, 6), '#ffffff', 2); flat(P.circ(x + ex, y - 5, 3), INK); }
  inked(P.ell(x, y + 10, 6, 3 + hic * 5), '#4a1030', 2);
  const cy = y - 40 - hic * 16; inked(P.ell(x + 20, cy, 9, 9 * (reduce ? 1 : Math.abs(Math.cos(t * 6)))), '#ffd23f', 3);
}
// Wormhole: a swirl with two feeders' price tags swapping places round it.
function wormhole(x, y, t) {
  glow(x, y, t, '#e2ccff');
  cut(P.circ(x, y, 32), '#3b1f78', { lw: 4, d: 1.2 });
  for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(x, y, 26 - i * 8, (reduce ? 0 : t * 3) + i * 2, (reduce ? 0 : t * 3) + i * 2 + 4.2); ctx.strokeStyle = ['#a268ff', '#56e1ff', '#fff3b0'][i]; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.stroke(); }
  const a = reduce ? .6 : t * 1.6;
  for (const [k, col] of [[0, '#8fdc2f'], [Math.PI, '#ff9a1f']]) { const tx = x + Math.cos(a + k) * 46, ty = y + Math.sin(a + k) * 20; cut(P.rect(tx - 10, ty - 7, 20, 14, 3), PAPER, { lw: 2.5, d: .3 }); flat(P.circ(tx - 4, ty, 3), col); }
}
// Dark-matter vial: an opaque black bottle with a white question mark and a skull-free label. Contents unknown.
function darkVial(x, y, t) {
  glow(x, y, t, '#8a72c8');
  const B = new Path2D(); B.moveTo(x - 7, y - 36); B.lineTo(x + 7, y - 36); B.lineTo(x + 7, y - 20); B.quadraticCurveTo(x + 26, y - 14, x + 26, y + 6);
  B.quadraticCurveTo(x + 26, y + 32, x, y + 32); B.quadraticCurveTo(x - 26, y + 32, x - 26, y + 6); B.quadraticCurveTo(x - 26, y - 14, x - 7, y - 20); B.closePath();
  cut(B, '#1b1236', { lw: 4, d: 1.4 });
  for (let i = 0; i < 6; i++) { const a = i + (reduce ? 0 : t * .8); flat(P.circ(x + Math.cos(a * 1.7) * 14, y + 8 + Math.sin(a * 1.3) * 12, 1.8), '#c47fc8', .9); }
  ctx.font = '400 24px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff3d6'; ctx.fillText('?', x, y + 8);
  inked(P.rect(x - 9, y - 46, 18, 12, 3), '#3a2a5c', 3);
}
// The rival goop: a sulky purple goop with a headband, cracking its knuckles. Also the click-off opponent.
export function rivalGoop(x, y, t, s = 1, mood = 0) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  const pts = [];
  for (let i = 0; i < 22; i++) { const a = i / 22 * Math.PI * 2, rr = 32 * (1 + .06 * Math.sin(3 * a + (reduce ? 0 : t * 3))); pts.push([Math.cos(a) * rr, Math.sin(a) * rr * .86]); }
  cut(P.smooth(pts), '#7641d8', { lw: 4, d: 1 });
  flat(P.ell(-12, -12, 9, 5, -.6), '#d6bdff', .9);
  inked(P.rect(-32, -18, 64, 8, 3), '#ff5f8f', 2.5); line([[30, -14], [42, -22]], '#ff5f8f', 4); line([[30, -12], [42, -6]], '#ff5f8f', 4);
  for (const ex of [-10, 10]) { inked(P.circ(ex, -2, 7), '#ffffff', 2.5); flat(P.circ(ex - 1, -1, 3.4), INK); line([[ex - 7, -10 - (ex < 0 ? -2 : 2)], [ex + 7, -10 + (ex < 0 ? -2 : 2)]], INK, 3.5); }
  ctx.beginPath(); if (mood > 0) ctx.arc(0, 8, 9, .2, Math.PI - .2); else { ctx.moveTo(-9, 14); ctx.quadraticCurveTo(0, 8, 10, 12); } ctx.strokeStyle = INK; ctx.lineWidth = 3.5; ctx.lineCap = 'round'; ctx.stroke();
  for (const d of [-1, 1]) inked(P.circ(d * 34, 12 + (reduce ? 0 : Math.sin(t * 8 + d) * 2), 7), '#7641d8', 3);
  ctx.restore();
}
// Supernova (a star mid-pop) and its slow-burning sibling, an ember in a jar.
function nova(x, y, t) {
  glow(x, y, t, '#fff3b0');
  const n = 10, pts = [], pulse = reduce ? 1 : 1 + .08 * Math.sin(t * 9);
  for (let i = 0; i < n * 2; i++) { const a = i / (n * 2) * Math.PI * 2, r = (i % 2 ? 16 : 36) * pulse; pts.push([x + Math.cos(a) * r, y + Math.sin(a) * r]); }
  cut(P.poly(pts), '#ffd23f', { lw: 4, d: 1.2 });
  flat(P.circ(x, y, 12), '#fff3d6');
  for (const ex of [-5, 5]) flat(P.circ(x + ex, y - 2, 2), INK);
  ctx.beginPath(); ctx.arc(x, y + 3, 4, 0, Math.PI * 2); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke();
}
function ember(x, y, t) {
  glow(x, y, t, '#ffc4b3');
  const J = P.rect(x - 22, y - 26, 44, 56, 10);
  cut(J, '#e8fbff', { lw: 4, d: 1.4 });
  const f = reduce ? 0 : Math.sin(t * 7) * 3;
  const F = new Path2D(); F.moveTo(x, y - 14 + f); F.quadraticCurveTo(x + 16, y + 6, x + 10, y + 20); F.lineTo(x - 10, y + 20); F.quadraticCurveTo(x - 16, y + 6, x, y - 14 + f); F.closePath();
  inked(F, '#ff7a59', 2.5); flat(P.ell(x, y + 10, 5, 8), '#ffd23f');
  inked(P.rect(x - 24, y - 36, 48, 12, 3), EDGE, 3);
}
// The cosmic tax collector: a tall top hat with stars on it, a monocle, and an enormous ledger.
function taxman(x, y, t) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(reduce ? 0 : Math.sin(t * 2) * .05);
  inked(P.ell(-12, 54, 12, 6), INK, 2); inked(P.ell(12, 54, 12, 6), INK, 2);
  cut(P.poly([[-24, -8], [24, -8], [30, 50], [-30, 50]]), '#2447c4', { lw: 4, d: 1.2 });
  for (const [sx, sy] of [[-14, 8], [10, 26], [-6, 38]]) flat(P.circ(sx, sy, 2.5), '#fff3b0');
  line([[0, -6], [0, 48]], '#a6c0ff', 2.5);
  cut(P.circ(0, -28, 20), '#cfc8ee', { lw: 3.5, d: .6 });
  flat(P.circ(-7, -30, 2.6), INK); inked(P.circ(7, -30, 6), 'rgba(227,250,255,.6)', 2); flat(P.circ(7, -30, 2.6), INK); line([[13, -27], [16, -14]], '#ffd23f', 1.5);
  line([[-6, -18], [6, -19]], INK, 3);
  inked(P.ell(0, -45, 28, 6), INK, 3); inked(P.rect(-16, -86, 32, 42, 4), '#140b24', 3); flat(P.circ(-5, -70, 3), '#ffd23f'); flat(P.circ(6, -60, 2.5), '#fff3b0');
  ctx.save(); ctx.translate(-30, 16); ctx.rotate(-.15);
  cut(P.rect(-18, -22, 36, 44, 3), '#b01fa3', { lw: 3, d: .6 }); inked(P.rect(-14, -16, 28, 32, 2), PAPER, 2);
  for (const ly of [-8, -2, 4, 10]) line([[-9, ly], [9, ly]], INK, 1.5);
  ctx.restore();
  ctx.restore();
}

const LOOKS = { frenzy: frenzyVial, geyser: geyserVial, drip: dripVial, bubbling: bubblingVial, mystery: mysteryVial, inspector, rival,
  bell: lunchBell, pigeon, comet: cometShower, blackhole: blackHole, wormhole, darkvial: darkVial, rivalgoop: (x, y, t) => { glow(x, y, t, '#d6bdff'); rivalGoop(x, y, t); }, nova, ember, taxman };
export const VISITOR_LOOKS = ['inspector', 'rival', 'pigeon', 'taxman'];
export const LOOK_IDS = Object.keys(LOOKS);

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

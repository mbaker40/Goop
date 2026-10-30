import { P, cut, inked, flat, box, line, vgrad, hang, label, ctx, reduce, W, H, INK, EDGE, PAPER, FONT, clamp, lerp, easeOut, rng, mix } from '../draw.js';

/* ---------- six dioramas. back() is the painted backdrop (no outlines); mid() and front() are cutouts either side of the goop ---------- */
export const STARS = (() => { const r = rng(3); return Array.from({ length: 90 }, () => [r() * (W + 80) - 40, r() * (H + 80) - 40, .7 + r() * 1.8, r() * 6.3]); })();
export function space(t, top, bottom, blobs) {
  ctx.fillStyle = vgrad(0, H, top, bottom); ctx.fillRect(-60, -60, W + 120, H + 120);
  for (const [bx, by, br, c] of blobs) { const g = ctx.createRadialGradient(bx, by, 0, bx, by, br); g.addColorStop(0, c); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(bx - br, by - br, br * 2, br * 2); }
  for (const [sx, sy, sr, ph] of STARS) { ctx.globalAlpha = reduce ? .8 : .55 + .45 * Math.sin(t * 1.7 + ph); ctx.fillStyle = PAPER; ctx.beginPath(); ctx.arc(sx, sy, sr, 0, 7); ctx.fill(); }
  ctx.globalAlpha = 1;
}
export function porthole(x, y, r) {
  flat(P.circ(x, y, r * 1.18), '#3f3080'); flat(P.circ(x, y, r), '#1f2468');
  flat(P.circ(x + r * .38, y - r * .32, r * .26), PAPER); flat(P.circ(x + r * .5, y - r * .4, r * .24), '#1f2468');
  for (const [dx, dy] of [[-.5, -.4], [-.2, .35], [.3, .5], [-.6, .15]]) flat(P.circ(x + dx * r, y + dy * r, Math.max(1.2, r * .03)), PAPER);
  box(x - r * .05, y - r, r * .1, r * 2, '#3f3080'); box(x - r, y - r * .05, r * 2, r * .1, '#3f3080');
}
export function flask(x, y, h, col) {
  const F = P.poly([[x - h * .13, y - h], [x + h * .13, y - h], [x + h * .13, y - h * .55], [x + h * .42, y], [x - h * .42, y], [x - h * .13, y - h * .55]]);
  cut(F, '#e3faff', { lw: 3, d: .6 });
  ctx.save(); ctx.clip(F); box(x - h, y - h * .38, h * 2, h, col); ctx.restore();
  ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke(F);
}
export function lamp(x, y, t) {
  hang(x, y);
  flat(P.poly([[x - 26, y + 40], [x + 26, y + 40], [x + 150, H], [x - 150, H]]), 'rgba(255,240,170,.11)');
  cut(P.poly([[x - 32, y + 40], [x + 32, y + 40], [x + 14, y], [x - 14, y]]), '#22c3b0', { lw: 3.5, d: .7 });
  inked(P.ell(x, y + 41, 14, 6), '#fff3b0', 3);
}
export function cloud(x, y, s) {
  hang(x, y - 14 * s);
  const c = new Path2D();
  c.moveTo(x - 46 * s, y + 14 * s); c.arc(x - 34 * s, y, 16 * s, Math.PI * .6, Math.PI * 1.5); c.arc(x - 8 * s, y - 14 * s, 22 * s, Math.PI * 1.1, Math.PI * 1.9);
  c.arc(x + 24 * s, y - 4 * s, 18 * s, Math.PI * 1.4, Math.PI * .3); c.lineTo(x - 46 * s, y + 14 * s); c.closePath();
  cut(c, '#ffffff', { lw: 3.5, d: 1.2 });
}
export function building(x, top, w, col, lean, lit) {
  const h = 574 - top;
  ctx.save(); ctx.translate(x + w / 2, 574); ctx.rotate(lean);
  cut(P.rect(-w / 2, -h, w, h + 50, 4), col, { lw: 4, d: 1.2 });
  box(-w / 2 + 8, -h - 12, w * .4, 12, INK);
  const cols = Math.floor((w - 16) / 24), rows = Math.floor((h - 26) / 30);
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
    const on = (i * 7 + j * 5 + Math.floor(x)) % lit === 0;
    flat(P.rect(-w / 2 + 12 + i * ((w - 24) / cols) + 2, -h + 16 + j * 30, (w - 24) / cols - 8, 18, 2), on ? '#fff3b0' : INK, on ? 1 : .32);
  }
  ctx.restore();
}
export function planet(x, y, r, col, detail) { hang(x, y - r); const C = P.circ(x, y, r); cut(C, col, { lw: 4, d: 1.1 }); if (detail) { ctx.save(); ctx.clip(C); detail(); ctx.restore(); ctx.lineWidth = 4; ctx.strokeStyle = INK; ctx.stroke(C); } }
export function asteroid(x, y, r, rot) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot || 0);
  cut(P.poly([[-r, -r * .2], [-r * .4, -r * .85], [r * .5, -r * .7], [r, -r * .1], [r * .7, r * .7], [-r * .3, r * .85], [-r * .95, r * .45]]), '#b98852', { lw: Math.max(2.5, r * .12), d: .8 });
  flat(P.circ(-r * .2, -r * .1, r * .2), '#8f6638'); flat(P.circ(r * .4, r * .25, r * .15), '#8f6638');
  ctx.restore();
}

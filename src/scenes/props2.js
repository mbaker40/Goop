import { P, cut, inked, flat, box, line, hang, label, ctx, reduce, W, H, INK, PAPER, clamp, lerp, rng } from '../draw.js';

/* ---------- Act 2 props: the same cardboard cutouts, scaled up to stars and galaxies ---------- */
const wob = (t, f, ph) => (reduce ? 0 : Math.sin(t * f + ph));

// A star with a face, like the Sun in stage 6. mood: 'calm', 'worried' or 'baby'.
export function faceStar(x, y, r, col, rayCol, t, mood = 'calm', ph = 0) {
  const rays = [];
  for (let i = 0; i < 20; i++) { const an = i / 20 * Math.PI * 2 + (reduce ? 0 : t * .25 + ph); rays.push([x + Math.cos(an) * r * (i % 2 ? 1.08 : 1.4), y + Math.sin(an) * r * (i % 2 ? 1.08 : 1.4)]); }
  cut(P.poly(rays), rayCol, { lw: Math.max(3, r * .07), d: .8 });
  cut(P.circ(x, y, r), col, { lw: Math.max(3, r * .09), d: .6 });
  const er = r * .17;
  for (const ex of [-.3, .3]) {
    inked(P.circ(x + ex * r, y - r * .12, er), '#ffffff', Math.max(2, r * .05));
    const dx = mood === 'worried' ? .08 : 0;
    flat(P.circ(x + ex * r + dx * r, y - r * .1, er * .5), INK);
  }
  ctx.beginPath(); ctx.strokeStyle = INK; ctx.lineWidth = Math.max(2.5, r * .07); ctx.lineCap = 'round';
  if (mood === 'worried') { ctx.ellipse(x, y + r * .38, r * .14, r * .1, 0, 0, 7); ctx.stroke(); line([[x - r * .5, y - r * .44], [x - r * .14, y - r * .34]], INK, Math.max(2.5, r * .07)); line([[x + r * .5, y - r * .44], [x + r * .14, y - r * .34]], INK, Math.max(2.5, r * .07)); }
  else { ctx.arc(x, y + r * .12, r * .3, Math.PI * .22, Math.PI * .78); ctx.stroke(); }
  if (mood === 'baby') { inked(P.circ(x, y + r * .42, r * .16), '#ff8fc0', 2.5); inked(P.ell(x, y + r * .42, r * .3, r * .08), '#ffd23f', 2.5); }
}

// A spiral galaxy as a tilted cardboard disc with arms of dots. tilt: y squash (1 = face on).
export function galaxy(x, y, r, disc, arm, t, tilt = .5, rot = 0, speed = .3) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(1, tilt);
  cut(P.circ(0, 0, r), disc, { lw: Math.max(3, r * .05), d: .8 });
  const spin = reduce ? 0 : t * speed;
  for (let a = 0; a < 2; a++) for (let i = 0; i < 22; i++) {
    const u = i / 22, an = a * Math.PI + u * 5 + spin, rr = r * (.12 + u * .8);
    flat(P.circ(Math.cos(an) * rr, Math.sin(an) * rr, Math.max(1.5, r * .06 * (1 - u * .55))), arm, .95 - u * .4);
  }
  flat(P.circ(0, 0, r * .2), '#fff3b0'); flat(P.circ(0, 0, r * .1), '#ffffff');
  ctx.restore();
}
// A fuzzy elliptical or dwarf galaxy: a flat blob of dots.
export function blobGalaxy(x, y, r, col, seed, t) {
  const sr = rng(seed);
  flat(P.ell(x, y, r, r * .7), col, .35);
  for (let i = 0; i < 18; i++) { const a = sr() * 7, d = Math.sqrt(sr()) * r; flat(P.circ(x + Math.cos(a) * d, y + Math.sin(a) * d * .7, 1.5 + sr() * 2.5), i % 4 ? '#fff3d6' : col, .6 + .4 * Math.abs(wob(t, 2, i))); }
  flat(P.circ(x, y, r * .2), '#fff3b0', .9);
}
// A hanging cardboard sign.
export function sign(x, y, w, h, txt, size, t, fill = PAPER, ink = INK, ph = 0) {
  hang(x - w * .3, y - h / 2); hang(x + w * .3, y - h / 2);
  ctx.save(); ctx.translate(x, y); ctx.rotate(wob(t, 1.1, ph) * .05);
  cut(P.rect(-w / 2, -h / 2, w, h, 6), fill, { lw: 4, d: 1 });
  const lines = String(txt).split('\n');
  lines.forEach((l, i) => label(l, 0, (i - (lines.length - 1) / 2) * size * 1.05 + 2, size, ink));
  ctx.restore();
}
// Soft, unoutlined nebula cloud for backdrops.
export function haze(x, y, s, col, a = .35) {
  for (const [dx, dy, r] of [[0, 0, 1], [.8, .2, .7], [-.7, .25, .75], [.3, -.45, .6], [-.3, -.4, .55]]) flat(P.circ(x + dx * s, y + dy * s, r * s), col, a);
}
// A curve of glowing blobs from (ax,ay) into the goop's mouth, like the straw in stage 6.
export function stream(ax, ay, bx, by, t, col, n = 8, big = 14, lift = 100, speed = .32) {
  for (let i = 0; i < n; i++) {
    const u = reduce ? i / n : ((t * speed + i / n) % 1), v = 1 - u, qx = (ax + bx) / 2, qy = Math.min(ay, by) - lift;
    inked(P.circ(v * v * ax + 2 * v * u * qx + u * u * bx, v * v * ay + 2 * v * u * qy + u * u * by, lerp(big, big * .35, u)), col, 3);
  }
}
// A five-point cutout star, for snacks and decorations.
export function star5(x, y, r, col, rot = 0, lw = 3) {
  const pts = [];
  for (let i = 0; i < 10; i++) { const a = rot - Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * .45 : r; pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]); }
  cut(P.poly(pts), col, { lw, d: .5 });
}
// A row of bunting between two points.
export function bunting(x0, y0, x1, y1, t, cols, n = 9) {
  const sag = 34;
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo((x0 + x1) / 2, (y0 + y1) / 2 + sag * 2, x1, y1); ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.stroke();
  for (let i = 1; i < n; i++) {
    const u = i / n, v = 1 - u, px = v * v * x0 + 2 * v * u * (x0 + x1) / 2 + u * u * x1, py = v * v * y0 + 2 * v * u * ((y0 + y1) / 2 + sag * 2) + u * u * y1;
    const sw = wob(t, 2, i) * 4;
    cut(P.poly([[px - 16, py], [px + 16, py], [px + sw, py + 34]]), cols[i % cols.length], { lw: 3, d: .6 });
  }
}
export { wob };

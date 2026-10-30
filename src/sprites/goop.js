import { P, cut, inked, flat, box, line, vgrad, hang, label, ctx, reduce, W, H, INK, EDGE, PAPER, FONT, clamp, lerp, easeOut, rng, mix } from '../draw.js';

/* ---------- the goop ---------- */
// base colour, shade, highlight for each stage: lime, aqua, violet, molten orange, hot pink, deep-space indigo
export const GOOP = [['#8fdc2f', '#62ae1c', '#cdf680'], ['#2fd4c4', '#17a096', '#a6f4e9'], ['#a268ff', '#7641d8', '#d6bdff'],
              ['#ff9a1f', '#df6a0a', '#ffd48f'], ['#ff4f9a', '#d02570', '#ffaed2'], ['#4330d8', '#2b1b9e', '#8794ff']];
export const EYES = [[0, -.3, .25], [.4, -.18, .17], [-.45, -.1, .15], [.14, -.64, .12], [-.3, -.58, .11], [.62, .12, .1], [-.68, .2, .09], [.44, -.5, .09], [-.04, -.84, .075]];
export const EYE_COUNT = [1, 2, 3, 5, 7, 9];
export const SPOTS = (() => { const r = rng(7); return Array.from({ length: 16 }, () => [r() * 1.5 - .75, r() * 1.3 - .45, .05 + r() * .09, r() * 6.3]); })();

export function goopColours(k, p) {
  const a = GOOP[k], b = GOOP[Math.min(k + 1, GOOP.length - 1)], m = clamp(p, 0, 1) * .3;   // drifts toward the next stage's colour as it fattens
  return [mix(a[0], b[0], m), mix(a[1], b[1], m), mix(a[2], b[2], m)];
}
export function drawGoop(g, r, k, p, t, fx) {       // g: {x, base, grounded}; fx: {squash, mouth, lookX, lookY}
  const tt = reduce ? 0 : t, x = g.x;
  const [col, shade, light] = goopColours(k, p);
  const sx = 1 + fx.squash * .1, sy = 1 - fx.squash * .12;
  const cy = g.grounded ? g.base - r * .7 * sy : g.base;
  const N = 44, pts = [];
  for (let i = 0; i < N; i++) {
    const a = i / N * Math.PI * 2;
    const wob = 1 + .05 * Math.sin(3 * a + tt * 1.6) + .035 * Math.sin(5 * a - tt * 2.1) + .03 * Math.sin(2 * a + tt * .9);
    let px = Math.cos(a) * r * wob * sx, py = Math.sin(a) * r * wob * sy;
    if (g.grounded) { const low = Math.max(0, Math.sin(a)); px *= 1 + .34 * low * low; py = Math.min(py, r * .7 * sy); }
    pts.push([x + px, cy + py]);
  }
  const body = P.smooth(pts), lw = clamp(r * .04, 4, 7);

  if (g.grounded) inked(P.ell(x, g.base + 2, r * 1.52 * sx, Math.max(5, r * .1)), shade, lw * .8);          // puddle
  if (k === 2 || k === 3) {                                                                                 // tentacles, as chains of shrinking discs
    const arms = k === 2 ? [[-1, .15, 0], [1, .05, 2], [1, -.35, 4]] : [[-1, .15, 0], [1, .05, 2], [1, -.4, 4], [-1, -.4, 6]];
    for (const [dir, oy, ph] of arms) {
      const seg = [];
      for (let i = 0; i < 11; i++) seg.push([x + dir * r * (.72 + i * .085), cy + r * oy - i * r * .055 + Math.sin(tt * 2.2 + i * .7 + ph) * r * .012 * i, r * .12 * (1 - i / 13)]);
      for (const [ax, ay, ar] of seg) flat(P.circ(ax + 2, ay + 3, ar + lw * .55), INK);
      for (const [ax, ay, ar] of seg) flat(P.circ(ax, ay, ar), col);
    }
  }
  if (k === 3) for (const f of [.63, .69, .75, .81, .87]) {                                                 // horns
    const i = Math.round(f * N), q = pts[i], a0 = pts[i - 2], a1 = pts[i + 2];
    cut(P.poly([a0, [x + (q[0] - x) * 1.24, cy + (q[1] - cy) * 1.24], a1]), '#ffd23f', { lw: lw * .8, d: .6 });
  }
  if (k === 5) {                                                                                            // flare collar
    const c = [];
    for (let i = 0; i < 28; i++) { const a = i / 28 * Math.PI * 2 + tt * .15; const rr = r * (i % 2 ? 1.08 : 1.3 + .04 * Math.sin(tt * 3 + i)); c.push([x + Math.cos(a) * rr, cy + Math.sin(a) * rr]); }
    cut(P.poly(c), '#56e1ff', { lw: lw * .8, d: 1 });
  }

  cut(body, col, { lw, d: 1.5 });
  ctx.save(); ctx.clip(body);
  const cres = new Path2D(); cres.rect(x - r * 3, cy - r * 3, r * 6, r * 6); cres.ellipse(x - r * .16, cy - r * .2, r * 1.06 * sx, r * 1.0 * sy, 0, 0, 7);
  ctx.fillStyle = shade; ctx.fill(cres, 'evenodd');                                                         // one flat shadow shape, no gradients
  if (k === 5) {
    const sr = rng(11);
    for (let i = 0; i < 26; i++) {
      const px = x + (sr() * 1.8 - .9) * r, py = cy + (sr() * 1.8 - .9) * r, tw = .5 + .5 * Math.sin(tt * 3 + i * 1.9), q = (2 + sr() * 4) * (.6 + .4 * tw) * r / 150;
      flat(P.poly([[px, py - q * 2.4], [px + q * .6, py - q * .6], [px + q * 2.4, py], [px + q * .6, py + q * .6], [px, py + q * 2.4], [px - q * .6, py + q * .6], [px - q * 2.4, py], [px - q * .6, py - q * .6]]), i % 3 ? '#ffffff' : '#56e1ff', .5 + .5 * tw);
    }
  } else {
    const n = [2, 4, 5, 7, 8][k];
    for (let i = 0; i < n; i++) { const s = SPOTS[i]; flat(P.circ(x + s[0] * r, cy + s[1] * r, s[2] * r), k === 3 ? light : shade, k === 3 ? .8 : .75); }
    for (let i = 0; i < 5; i++) {                                                                           // bubbles drifting up
      const u = ((tt * .13 + i * .21) % 1), bx = x + (SPOTS[i + 8][0]) * r * .9 + Math.sin(tt * 2 + i) * r * .03, by = cy + r * .6 - u * r * 1.4;
      ctx.globalAlpha = Math.sin(u * Math.PI); ctx.beginPath(); ctx.arc(bx, by, r * (.03 + .02 * (i % 3)), 0, 7); ctx.strokeStyle = light; ctx.lineWidth = Math.max(1.5, r * .014); ctx.stroke(); ctx.globalAlpha = 1;
    }
  }
  flat(P.ell(x - r * .42, cy - r * .5, r * .26, r * .13, -.6), light, .9);
  flat(P.circ(x - r * .13, cy - r * .7, r * .05), light, .9);
  ctx.restore();
  ctx.lineWidth = lw; ctx.strokeStyle = INK; ctx.lineJoin = 'round'; ctx.stroke(body);

  const mx = x + r * .05, my = cy + r * (k === 0 ? .2 : .3), m = clamp(fx.mouth, 0, 1), mlw = clamp(r * .03, 2.5, 5);
  if (m < .06) { ctx.beginPath(); ctx.arc(mx, my - r * .16, r * .3, Math.PI * .22, Math.PI * .78); ctx.strokeStyle = INK; ctx.lineWidth = mlw * 1.2; ctx.lineCap = 'round'; ctx.stroke(); }
  else {
    const M = P.ell(mx, my, r * .27, r * (.04 + .2 * m));
    inked(M, '#4a1030', mlw); ctx.save(); ctx.clip(M); flat(P.circ(mx + r * .04, my + r * .24, r * .2), '#ff7aa8'); ctx.restore();
    ctx.lineWidth = mlw; ctx.strokeStyle = INK; ctx.stroke(M);
  }
  const ne = EYE_COUNT[k];
  for (let i = 0; i < ne; i++) {
    const e = EYES[i], ex = x + e[0] * r * sx, ey = cy + e[1] * r * sy, er = e[2] * r;
    const blink = !reduce && ((t * .9 + i * 1.7) % 4.3) < .13 ? .12 : 1;
    inked(P.ell(ex, ey, er, er * blink), '#ffffff', clamp(er * .16, 2, 5));
    if (blink === 1) {
      const dx = fx.lookX - ex, dy = fx.lookY - ey, dl = Math.hypot(dx, dy) || 1;
      const qx = ex + dx / dl * er * .4, qy = ey + dy / dl * er * .4;
      flat(P.circ(qx, qy, er * .46), INK); flat(P.circ(qx - er * .14, qy - er * .16, er * .13), '#ffffff');
    }
  }
  return cy;
}

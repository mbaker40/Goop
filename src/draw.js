/* Drawing kit: everything is a "cardboard cutout" = hard shadow + tan edge + flat fill + thick ink line.
   The canvas context and the device-pixel scale are live bindings, set once at boot by render.js. */
export const W = 960, H = 600;
export let ctx = null;
export let S = 1;                            // device pixels per scene unit
export function setContext(c) { ctx = c; }
export function setScale(s) { S = s; }
export const reduce = typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
export const INK = '#2a1838', EDGE = '#b98852', PAPER = '#fff3d6';
export const FONT = '"Lilita One","Arial Rounded MT Bold","Trebuchet MS",sans-serif';
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, t) => a + (b - a) * t;
export const easeOut = t => 1 - Math.pow(1 - t, 3);
export { rng } from './rng.js';
export function mix(a, b, t) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const ch = s => Math.round(lerp(pa >> s & 255, pb >> s & 255, t));
  return '#' + ((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1);
}

export const P = {
  poly(pts) { const p = new Path2D(); pts.forEach(([x, y], i) => i ? p.lineTo(x, y) : p.moveTo(x, y)); p.closePath(); return p; },
  rect(x, y, w, h, r) { const p = new Path2D(); if (r && p.roundRect) p.roundRect(x, y, w, h, r); else p.rect(x, y, w, h); return p; },
  circ(x, y, r) { const p = new Path2D(); p.arc(x, y, Math.max(0.1, r), 0, 7); return p; },
  ell(x, y, rx, ry, rot) { const p = new Path2D(); p.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot || 0, 0, 7); return p; },
  smooth(pts) {                              // closed curve through the midpoints of a point ring
    const p = new Path2D(), n = pts.length, mid = i => [(pts[i][0] + pts[(i + 1) % n][0]) / 2, (pts[i][1] + pts[(i + 1) % n][1]) / 2];
    const m0 = mid(n - 1); p.moveTo(m0[0], m0[1]);
    for (let i = 0; i < n; i++) { const m = mid(i); p.quadraticCurveTo(pts[i][0], pts[i][1], m[0], m[1]); }
    p.closePath(); return p;
  },
};
export function cut(path, fill, o) {                // the cutout: o.d = how far it floats off the backdrop
  o = o || {};
  const lw = o.lw || 4, d = o.d == null ? 1 : o.d;
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.save();
  ctx.translate(2.5, 3.5);                   // the cardboard's thickness
  if (d > 0) { ctx.shadowColor = 'rgba(24,10,44,.3)'; ctx.shadowOffsetX = 7 * d * S; ctx.shadowOffsetY = 9 * d * S; ctx.shadowBlur = 0; }
  ctx.fillStyle = EDGE; ctx.fill(path);
  ctx.shadowColor = 'transparent';
  ctx.lineWidth = lw; ctx.strokeStyle = INK; ctx.stroke(path);
  ctx.restore();
  ctx.fillStyle = fill; ctx.fill(path);
  ctx.lineWidth = lw; ctx.strokeStyle = INK; ctx.stroke(path);
}
export function inked(path, fill, lw) { ctx.lineJoin = 'round'; ctx.fillStyle = fill; ctx.fill(path); ctx.lineWidth = lw || 3; ctx.strokeStyle = INK; ctx.stroke(path); }
export function flat(path, fill, a) { if (a != null) ctx.globalAlpha = a; ctx.fillStyle = fill; ctx.fill(path); ctx.globalAlpha = 1; }
export function box(x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); }
export function line(pts, c, lw) { ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.strokeStyle = c; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke(); }
export function vgrad(y0, y1, c0, c1) { const g = ctx.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, c0); g.addColorStop(1, c1); return g; }
export function hang(x, y, fromX) { line([[fromX == null ? x : fromX, -30], [x, y]], 'rgba(255,243,214,.62)', 1.6); }   // the string every dangling prop hangs from
export function label(txt, x, y, size, fill, rot) {
  ctx.save(); ctx.translate(x, y); if (rot) ctx.rotate(rot);
  ctx.font = '400 ' + size + 'px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = fill; ctx.fillText(txt, 0, 0); ctx.restore();
}

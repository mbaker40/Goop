import { P, cut, inked, flat, box, line, vgrad, hang, label, ctx, reduce, W, H, INK, EDGE, PAPER, FONT, clamp, lerp, easeOut, rng, mix } from '../draw.js';

/* ---------- the scientist ---------- */
export function sciHead() {                         // local space: chin near (8,0), top of head at y = -112
  cut(P.poly([[-44, -108], [-82, -124], [-62, -92], [-90, -78], [-58, -64], [-76, -42], [-34, -54]]), '#f7f4ff', { lw: 3.5, d: .5 });
  cut(P.poly([[46, -108], [78, -120], [64, -92], [84, -76], [58, -66], [68, -48], [40, -58]]), '#f7f4ff', { lw: 3.5, d: .5 });
  cut(P.poly([[-44, -112], [48, -112], [38, -22], [8, 0], [-28, -22]]), '#f4c9a0', { lw: 3.5, d: .5 });
  inked(P.rect(-46, -90, 96, 13), '#3b2a63', 3);
  for (const gx of [-15, 27]) { inked(P.circ(gx, -82, 20), '#8f9bb8', 3.5); inked(P.circ(gx, -82, 13.5), '#dffcf6', 2.5); flat(P.circ(gx + 5, -81, 5.5), INK); }
  line([[-36, -112], [-4, -103]], INK, 4.5); line([[48, -112], [16, -103]], INK, 4.5);
  inked(P.rect(-16, -52, 48, 17, 7), '#ffffff', 3);
  for (const tx of [-4, 8, 20]) line([[tx, -51], [tx, -36]], INK, 2);
}
export function scientist(x, y, s, t, fling) {      // feet at (x,y); fling 0..1 is the spoon-arm swing
  ctx.save(); ctx.translate(x, y + (reduce ? 0 : Math.sin(t * 2.4) * 2.5 * s)); ctx.scale(s, s);
  inked(P.rect(-26, -66, 20, 60, 4), '#3b2a63', 3.5); inked(P.rect(8, -66, 20, 60, 4), '#3b2a63', 3.5);
  inked(P.ell(-12, -4, 20, 9), INK, 2); inked(P.ell(22, -4, 20, 9), INK, 2);
  cut(P.poly([[-44, -212], [50, -212], [68, -58], [-64, -58]]), '#f7f4ff', { lw: 3.5, d: .8 });
  line([[4, -206], [6, -62]], INK, 2.5);
  for (const by of [-176, -146, -116]) flat(P.circ(15, by, 4), INK);
  inked(P.rect(-44, -150, 24, 26, 3), '#f7f4ff', 2.5); line([[-38, -160], [-38, -148]], '#22c3b0', 4); line([[-30, -162], [-30, -148]], '#ff5f8f', 4);
  ctx.save(); ctx.translate(0, -206); sciHead(); ctx.restore();
  const a = -0.95 + Math.sin(clamp(fling, 0, 1) * Math.PI) * 1.25;
  ctx.save(); ctx.translate(40, -194); ctx.rotate(a);
  line([[84, 0], [134, -3]], INK, 8); line([[84, 0], [134, -3]], '#c9cfdf', 3.5); inked(P.ell(144, -4, 16, 11), '#c9cfdf', 3);
  cut(P.rect(-8, -13, 84, 26, 12), '#f7f4ff', { lw: 3.5, d: .5 });
  inked(P.circ(84, 0, 14), '#ffd23f', 3.5);
  ctx.restore();
  ctx.restore();
}
export function bobY(t, amp) { return reduce ? 0 : Math.sin(t * 1.8) * amp; }
export function pilot(cx, cy, r, glass) {           // the scientist's head behind a round window
  const G = P.circ(cx, cy, r);
  inked(G, glass, 5);
  ctx.save(); ctx.clip(G); ctx.translate(cx - 3, cy + r * .92); ctx.scale(r / 76, r / 76); sciHead(); ctx.restore();
  ctx.lineWidth = 5; ctx.strokeStyle = INK; ctx.stroke(G);
  ctx.beginPath(); ctx.arc(cx, cy, r * .72, -2.5, -1.7); ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 4; ctx.stroke();
}
export function heli(x, y, s, t) {
  ctx.save(); ctx.translate(x, y + bobY(t, 6)); ctx.scale(s, s);
  cut(P.poly([[-50, -14], [-196, -36], [-196, -16], [-50, 26]]), '#ff7a59', { lw: 5, d: .8 });
  inked(P.circ(-198, -26, 24), 'rgba(255,243,214,.55)', 3);
  line([[-44, 74], [70, 74]], INK, 7); line([[-24, 52], [-30, 74]], INK, 5); line([[40, 52], [48, 74]], INK, 5);
  cut(P.ell(0, 0, 94, 60), '#ff7a59', { lw: 5, d: .8 });
  flat(P.rect(-80, 14, 150, 12), '#fff3d6');
  pilot(36, -6, 46, '#c9f3ff');
  line([[0, -60], [0, -84]], INK, 6);
  const bl = reduce ? 130 : 40 + 100 * Math.abs(Math.cos(t * 16));
  inked(P.ell(0, -88, bl, 6), '#3b2a63', 3);
  ctx.restore();
}
export function rocket(x, y, s, t) {
  ctx.save(); ctx.translate(x, y + bobY(t, 5)); ctx.rotate(.55); ctx.scale(s, s);
  const fl = reduce ? 1 : 1 + .22 * Math.sin(t * 31);
  cut(P.poly([[-28, 118], [0, 118 + 96 * fl], [28, 118]]), '#ffb01f', { lw: 5, d: .5 });
  inked(P.poly([[-13, 120], [0, 120 + 52 * fl], [13, 120]]), '#fff3b0', 3);
  cut(P.poly([[-40, 50], [-96, 134], [-42, 120]]), '#ff5f5f', { lw: 5, d: .8 });
  cut(P.poly([[40, 50], [96, 134], [42, 120]]), '#ff5f5f', { lw: 5, d: .8 });
  const B = new Path2D(); B.moveTo(0, -156); B.bezierCurveTo(64, -94, 58, 60, 44, 120); B.lineTo(-44, 120); B.bezierCurveTo(-58, 60, -64, -94, 0, -156); B.closePath();
  cut(B, '#f7f4ff', { lw: 5, d: .8 });
  ctx.save(); ctx.clip(B); box(-80, -170, 160, 78, '#ff5f5f'); line([[-80, -92], [80, -92]], INK, 5); box(-80, 92, 160, 40, '#ff5f5f'); line([[-80, 92], [80, 92]], INK, 5); ctx.restore();
  ctx.lineWidth = 5; ctx.strokeStyle = INK; ctx.stroke(B);
  pilot(0, -20, 36, '#c9f3ff');
  ctx.restore();
}
export function saucer(x, y, s, t) {
  ctx.save(); ctx.translate(x, y + bobY(t, 7)); ctx.rotate(reduce ? 0 : Math.sin(t * 1.3) * .06); ctx.scale(s, s);
  inked(P.ell(0, 40, 46, 13), '#3b2a63', 4);
  const D = new Path2D(); D.arc(0, 0, 72, Math.PI, 0); D.closePath();
  cut(D, '#c9f3ff', { lw: 5, d: .8 });
  ctx.save(); ctx.clip(D); ctx.translate(-4, 8); ctx.scale(.62, .62); sciHead(); ctx.restore();
  ctx.lineWidth = 5; ctx.strokeStyle = INK; ctx.stroke(D);
  cut(P.ell(0, 12, 134, 34), '#22c3b0', { lw: 5, d: .8 });
  inked(P.ell(0, 2, 98, 17), '#6be6d6', 3);
  for (let i = 0; i < 5; i++) { const on = reduce || Math.floor(t * 4 + i) % 2; inked(P.circ(-96 + i * 48, 24 - Math.abs(i - 2) * 3, 8), on ? '#ffd23f' : '#ff5f8f', 3); }
  ctx.restore();
}

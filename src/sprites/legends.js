/* Feeder legends on stage (legends.js has the rules): a little icon for every feeder, the crowd that turns
   up in the scene once a feeder reaches 100, and the few-second set piece at 500. Cutouts, like the rest. */
import { P, cut, inked, flat, line, ctx, reduce, INK, PAPER, W, H, FONT, S, clamp, lerp } from '../draw.js';
import { LEGEND_BY_ID } from '../legends.js';
import { tag } from './events.js';

const C = (x, y, r, f, d = .4) => cut(P.circ(x, y, r), f, { lw: 3, d });
const R = (x, y, w, h, f, rr = 3, d = .4) => cut(P.rect(x, y, w, h, rr), f, { lw: 3, d });
const eyes = (x, y, g = 6) => { for (const d of [-1, 1]) { inked(P.circ(x + d * g, y, 3.6), '#ffffff', 1.8); flat(P.circ(x + d * g, y + .6, 1.7), INK); } };

// Each icon fits a box about 60 units across, centred on (0, 0). t: seconds, for the little wiggles.
export const ICONS = {
  pipette(t) { R(-5, -26, 10, 40, '#e8fbff', 4); flat(P.rect(-3, -2, 6, 14), '#8fdc2f'); cut(P.ell(0, -30, 9, 9), '#ff5f8f', { lw: 3, d: .3 }); line([[0, 14], [0, 24]], INK, 3); inked(P.circ(0, 28 + (reduce ? 0 : (t * 30) % 6), 3), '#8fdc2f', 1.6); },
  intern(t) { R(-12, -4, 24, 26, '#f7f4ff', 5); line([[0, -2], [0, 20]], INK, 1.8); C(0, -16, 11, '#f4c9a0'); cut(P.poly([[-11, -20], [-6, -28], [6, -28], [11, -20], [3, -24]]), '#5b4636', { lw: 2.5, d: .2 }); eyes(0, -16, 4.5); const a = reduce ? 0 : Math.sin(t * 6) * .4; ctx.save(); ctx.translate(11, 2); ctx.rotate(-.9 + a); line([[0, 0], [20, 0]], INK, 4); line([[0, 0], [20, 0]], '#c9cfdf', 2); inked(P.ell(24, 0, 5, 3.5), '#c9cfdf', 2); ctx.restore(); line([[-6, 22], [-6, 30]], INK, 4); line([[6, 22], [6, 30]], INK, 4); },
  chute(t) { cut(P.poly([[-26, -20], [-14, -26], [26, 14], [14, 20]]), '#c9cfdf', { lw: 3, d: .4 }); const u = reduce ? .5 : (t * .8) % 1; ctx.save(); ctx.translate(lerp(-16, 16, u), lerp(-20, 12, u)); cut(P.poly([[-10, 4], [10, 4], [0, -9]]), '#ffc93f', { lw: 2.5, d: .2 }); flat(P.rect(-6, -2, 12, 3), '#8fdc2f'); ctx.restore(); },
  truck(t) { R(-28, -16, 34, 24, '#62ae1c'); R(6, -8, 18, 16, '#ffd23f'); flat(P.rect(10, -5, 9, 6), '#dffcf6'); for (const wx of [-18, 14]) { C(wx, 10, 7, '#3b2a63', .2); flat(P.circ(wx, 10, 2.5), '#c9cfdf'); } line([[-24, -10], [0, -10]], '#cdf680', 2); },
  pipeline(t) { R(-28, -9, 56, 18, '#8f9bb8', 4); for (const fx of [-20, 18]) R(fx - 3, -13, 6, 26, '#6b7590', 2); flat(P.rect(-24, -6, 40, 4), '#c9cfdf', .7); const u = reduce ? .3 : (t * 1.2) % 1; inked(P.circ(lerp(-30, 34, u), 12, 3), '#8fdc2f', 1.6); },
  siphon(t) { ctx.beginPath(); ctx.moveTo(-20, 24); ctx.bezierCurveTo(-20, -30, 20, -30, 20, 10); ctx.strokeStyle = INK; ctx.lineWidth = 11; ctx.lineCap = 'round'; ctx.stroke(); ctx.strokeStyle = '#2fd4c4'; ctx.lineWidth = 6; ctx.stroke(); inked(P.ell(20, 22 + (reduce ? 0 : Math.sin(t * 5) * 2), 5, 7), '#56b4ff', 2); flat(P.ell(-20, 28, 14, 5), '#56b4ff', .8); },
  grinder(t) { ctx.save(); ctx.rotate(reduce ? 0 : t * 2); const p = []; for (let i = 0; i < 20; i++) { const a = i / 20 * Math.PI * 2, r = i % 2 ? 18 : 24; p.push([Math.cos(a) * r, Math.sin(a) * r]); } cut(P.poly(p), '#8f9bb8', { lw: 3, d: .4 }); C(0, 0, 7, '#6b7590', .1); ctx.restore(); },
  lasso(t) { ctx.save(); ctx.rotate(reduce ? 0 : t * 3); ctx.beginPath(); ctx.ellipse(0, -6, 22, 12, 0, 0, 7); ctx.strokeStyle = INK; ctx.lineWidth = 7; ctx.stroke(); ctx.strokeStyle = '#d9b98a'; ctx.lineWidth = 3.5; ctx.stroke(); ctx.restore(); line([[0, 6], [-6, 26]], INK, 6); line([[0, 6], [-6, 26]], '#d9b98a', 3); C(14, 16, 7, '#fff3d6', .2); },
  cracker(t) { C(0, 4, 20, '#ff5f1f'); line([[-6, -15], [2, -2], [-4, 8], [4, 22]], INK, 3); flat(P.circ(-8, -2, 4), '#ffb01f'); cut(P.poly([[-22, -26], [-4, -16], [-8, -10], [-26, -20]]), '#c9cfdf', { lw: 2.5, d: .3 }); },
  straw(t) { const b = reduce ? 0 : Math.sin(t * 4) * .2; ctx.save(); ctx.rotate(b); for (let i = 0; i < 6; i++) { flat(P.rect(-4, -30 + i * 9, 8, 9), i % 2 ? '#ff5f8f' : '#fff3d6'); } ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.strokeRect(-4, -30, 8, 54); line([[4, -28], [16, -38]], INK, 3); ctx.restore(); C(14, 26, 9, '#ffd23f', .3); },
  dyson(t) { C(0, -6, 16, '#ffd23f'); flat(P.circ(-4, -10, 5), '#fff3b0'); cut(P.poly([[-14, 2], [14, 2], [12, 24], [22, 30], [20, 36], [-12, 36]]), '#ff9ad8', { lw: 3, d: .3 }); for (const sy of [10, 18, 26]) line([[-12, sy], [12, sy]], '#e066b0', 2); },
  comet(t) { flat(P.poly([[-6, -6], [-30, -22], [-24, -6], [-32, 4], [4, 6]]), '#8fe8ff', .7); C(4, 2, 11, '#e3faff'); eyes(5, 1, 4); },
  spork(t) { R(-3, -2, 6, 30, '#c9cfdf', 3); const S = new Path2D(); S.moveTo(-12, -6); S.quadraticCurveTo(-12, -30, 0, -30); S.quadraticCurveTo(12, -30, 12, -6); S.quadraticCurveTo(0, 2, -12, -6); S.closePath(); cut(S, '#c9cfdf', { lw: 3, d: .3 }); for (const tx of [-6, 0, 6]) line([[tx, -30], [tx, -38]], INK, 3); flat(P.ell(0, -14, 6, 5), '#231838'); },
  gulper(t) { const o = reduce ? .6 : .4 + .4 * Math.abs(Math.sin(t * 4)); C(0, 0, 22, '#3b6cff'); inked(P.ell(0, 8, 14, 12 * o), '#140b24', 2.5); for (let i = 0; i < 5; i++) flat(P.circ(-8 + i * 4, 8 + Math.sin(i) * 3 * o, 1.4), '#fff3b0'); eyes(0, -10, 7); },
  towrope(t) { ctx.beginPath(); ctx.arc(-6, 2, 16, 0, Math.PI * 2); ctx.arc(-6, 2, 9, 0, Math.PI * 2); ctx.strokeStyle = INK; ctx.lineWidth = 6; ctx.stroke(); ctx.strokeStyle = '#d9b98a'; ctx.lineWidth = 3; ctx.stroke(); line([[10, 2], [24, -8]], INK, 5); ctx.beginPath(); ctx.arc(24, -2, 6, -Math.PI / 2, Math.PI * .8); ctx.strokeStyle = '#c9cfdf'; ctx.lineWidth = 4; ctx.stroke(); },
  wormhole(t) { C(0, 0, 22, '#3b1f78'); for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(0, 0, 17 - i * 5, (reduce ? 0 : t * 3) + i * 2, (reduce ? 0 : t * 3) + i * 2 + 4); ctx.strokeStyle = ['#a268ff', '#56e1ff', '#fff3b0'][i]; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.stroke(); } },
  compactor(t) { cut(P.poly([[-16, -8], [0, -18], [16, -8], [16, 14], [0, 24], [-16, 14]]), '#5fe8a8', { lw: 3, d: .4 }); line([[-16, -8], [0, 2], [16, -8]], INK, 2.5); line([[0, 2], [0, 24]], INK, 2.5); flat(P.circ(-8, 8, 2.5), '#fff3b0'); flat(P.circ(8, 12, 2), '#ffffff'); },
  magnet(t) { ctx.beginPath(); ctx.arc(0, -2, 16, Math.PI, 0); ctx.lineTo(16, 18); ctx.moveTo(-16, -2); ctx.lineTo(-16, 18); ctx.strokeStyle = INK; ctx.lineWidth = 14; ctx.lineCap = 'butt'; ctx.stroke(); ctx.strokeStyle = '#e23f3f'; ctx.lineWidth = 8; ctx.stroke(); for (const x of [-16, 16]) R(x - 7, 14, 14, 9, '#c9cfdf', 2, .1); },
  filfork(t) { R(-3, 0, 6, 28, '#c9cfdf', 3); cut(P.rect(-12, -12, 24, 14, 4), '#c9cfdf', { lw: 3, d: .3 }); for (const tx of [-8, -3, 3, 8]) line([[tx, -12], [tx, -28]], INK, 3); ctx.beginPath(); ctx.ellipse(0, -18, 14, 6, reduce ? 0 : t * 2, 0, 7); ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 3; ctx.stroke(); },
  vacstraw(t) { ctx.save(); ctx.rotate(-.3); R(-5, -30, 10, 56, '#1b1236', 3); for (let i = 0; i < 4; i++) flat(P.circ(0, -22 + i * 14, 1.6), '#c47fc8'); ctx.restore(); const u = reduce ? .5 : (t * 1.5) % 1; ctx.globalAlpha = 1 - u; ctx.beginPath(); ctx.arc(-10, -30, 6 + u * 14, 0, 7); ctx.strokeStyle = '#8a72c8'; ctx.lineWidth = 2.5; ctx.stroke(); ctx.globalAlpha = 1; },
  conladle(t) { line([[8, -4], [26, -30]], INK, 7); line([[8, -4], [26, -30]], '#c9cfdf', 3.5); const B = new Path2D(); B.moveTo(-22, -4); B.quadraticCurveTo(-20, 22, 0, 22); B.quadraticCurveTo(20, 22, 18, -4); B.closePath(); cut(B, '#c9cfdf', { lw: 3, d: .3 }); flat(P.ell(-2, 2, 15, 5), '#fff3b0', .9); },
  hopper(t) { const j = reduce ? 0 : -Math.abs(Math.sin(t * 5)) * 12; ctx.save(); ctx.translate(0, j); line([[-8, 10], [-14, 26]], INK, 5); line([[8, 10], [14, 26]], INK, 5); C(0, 0, 16, '#49c6f5'); eyes(0, -3, 6); cut(P.ell(-10, -20, 4, 10, -.3), '#49c6f5', { lw: 2.5, d: .2 }); cut(P.ell(10, -20, 4, 10, .3), '#49c6f5', { lw: 2.5, d: .2 }); ctx.restore(); },
  whisk(t) { ctx.save(); ctx.rotate(reduce ? 0 : Math.sin(t * 12) * .25); R(-4, 6, 8, 24, '#6a2a70', 3); for (const w of [6, 11, 16]) { ctx.beginPath(); ctx.ellipse(0, -10, w * .6, 20, 0, 0, 7); ctx.strokeStyle = INK; ctx.lineWidth = 4; ctx.stroke(); ctx.strokeStyle = '#c9cfdf'; ctx.lineWidth = 2; ctx.stroke(); } ctx.restore(); },
};
export function icon(id, x, y, s, t, rot = 0) {
  ctx.save(); ctx.translate(x, y); if (rot) ctx.rotate(rot); ctx.scale(s, s);
  (ICONS[id] || ICONS.pipette)(t); ctx.restore();
}

// The crowd at 100: a little cluster of the feeder along the front of the scene, bobbing. `slots`: the
// legends to show (most valuable last), at most three, each in its own third of the stage.
export function drawCrowd(ids, t) {
  ids.slice(-3).forEach((id, j, arr) => {
    const x0 = W * (j + .5) / arr.length - 120, lv = id.lv;
    for (let i = 0; i < 7; i++) {
      const bob = reduce ? 0 : Math.abs(Math.sin(t * 3 + i * .9 + j)) * 6;
      icon(id.id, x0 + i * 40, H - 30 - bob - (i % 2) * 10, lv === 2 ? .85 : .7, t + i, reduce ? 0 : Math.sin(t * 2 + i) * .08);
    }
  });
}

// The set piece at 500: a few seconds unique to the feeder (its icon and its choreography), over the
// scene, with the second title on top. u: 0..1 through it; gx, gy: the goop.
export function drawPiece(id, u, t, gx, gy) {
  const l = LEGEND_BY_ID[id]; if (!l) return;
  const fade = clamp(Math.min(u / .08, (1 - u) / .12), 0, 1), still = reduce;
  ctx.save(); ctx.setTransform(S, 0, 0, S, 0, 0);                   // over the camera: the set piece does not zoom with it
  ctx.save(); ctx.globalAlpha = fade * .35; ctx.fillStyle = '#140b24'; ctx.fillRect(0, 0, W, H); ctx.restore();
  ctx.save(); ctx.globalAlpha = fade;
  const T = still ? .5 : u;
  switch (l.piece) {
    case 'rain':
      for (let i = 0; i < 36; i++) { const x = (i * 97) % W + 20, sp = .7 + (i % 5) * .12, y = ((T * 2.2 * sp + i * .137) % 1.2) * (H + 120) - 80; icon(id, x, y, 1, t + i, still ? 0 : t * (i % 2 ? 2 : -2)); }
      break;
    case 'wave':
      for (let i = 0; i < 15; i++) { const x = 40 + i * (W - 80) / 14, ph = T * 3 - i / 14, up = still ? (i % 3 === 1 ? 1 : 0) : Math.max(0, Math.sin(clamp(ph, 0, 1) * Math.PI * 2)) * (ph > 0 && ph < 1 ? 1 : 0); icon(id, x, H - 80 - up * 80, 1.25, t + i, up * -.15); }
      break;
    case 'convoy':
      for (let i = 0; i < 12; i++) { const a = (still ? 0 : T * Math.PI * 4) + i / 12 * Math.PI * 2, x = gx + Math.cos(a) * 300, y = gy + Math.sin(a) * 110; icon(id, x, y, 1.15 + .3 * Math.sin(a), t + i); }
      break;
    case 'storm':
      for (let i = 0; i < 26; i++) { const a = (still ? 0 : T * Math.PI * 6) + i * 2.4, r = 90 + (i % 7) * 34 * (still ? 1 : .6 + .4 * Math.sin(T * 6 + i)); icon(id, gx + Math.cos(a) * r * 1.4, gy + Math.sin(a) * r * .7, .85 + (i % 3) * .15, t + i, still ? 0 : t * 4 + i); }
      break;
    case 'solo': {
      const sx = W * .32, sy = H * .58;
      ctx.save(); ctx.globalAlpha = fade * .45; ctx.fillStyle = '#fff3b0'; ctx.beginPath(); ctx.moveTo(sx - 30, 0); ctx.lineTo(sx + 30, 0); ctx.lineTo(sx + 170, H); ctx.lineTo(sx - 170, H); ctx.closePath(); ctx.fill(); ctx.restore();
      icon(id, sx, sy, 3, t * 2, still ? 0 : Math.sin(t * 5) * .25);
      for (let i = 0; i < 5; i++) { const v = still ? i / 5 : (T * 2 + i / 5) % 1; ctx.globalAlpha = fade * (1 - v); ctx.font = '400 40px ' + FONT; ctx.textAlign = 'center'; ctx.fillStyle = PAPER; ctx.strokeStyle = INK; ctx.lineWidth = 6; const nx = sx + 120 + i * 30 + Math.sin(v * 6 + i) * 20, ny = sy - 40 - v * 220; ctx.strokeText(i % 2 ? '♫' : '♪', nx, ny); ctx.fillText(i % 2 ? '♫' : '♪', nx, ny); }
      ctx.globalAlpha = fade;
      break;
    }
    default:                                                    // parade
      for (let i = 0; i < 14; i++) { const x = ((still ? .5 : T) * 1.6 * W + i * 74) % (W + 200) - 100, hop = still ? 0 : Math.abs(Math.sin(t * 6 + i)) * 14; icon(id, x, H * .78 - hop, 1.2, t + i); }
  }
  tag(l.t2, W / 2, 70, 52, 1, '#ffd23f');
  tag(l.line, W / 2, 122, 22, 1);
  ctx.restore(); ctx.restore();
}

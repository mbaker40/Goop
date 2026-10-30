import { P, cut, inked, flat, box, line, vgrad, hang, label, ctx, reduce, W, H, INK, EDGE, PAPER, FONT, clamp, lerp, easeOut, rng, mix } from '../draw.js';
import { STARS, space, porthole, flask, lamp, cloud, building, planet, asteroid } from './props.js';
import { faceStar, galaxy, blobGalaxy, sign, haze, stream, star5, bunting, wob } from './props2.js';
import { sciHead, scientist, bobY, pilot, heli, rocket, saucer } from '../sprites/scientist.js';
import { toaster, goopScientist, tinyHuman, tableRide } from '../sprites/act2.js';
import { goopColours } from '../sprites/goop.js';


export default { // 13: Laniakea (our home supercluster, 100,000 galaxies, all heading for the goop)
  goop: { x: 600, base: 310, grounded: false, r0: 108, r1: 210 }, hand: [190, 500],
  back(t, p, a) {
    space(t, '#0c2040', '#1a3a64', [[600, 310, 420, 'rgba(73,198,245,.22)']]);
    // streamlines, all flowing into the middle: the Great Attractor is the goop now
    ctx.setLineDash([14, 16]); ctx.lineDashOffset = reduce ? 0 : -t * 40; ctx.lineCap = 'round';
    for (let i = 0; i < 12; i++) {
      const an = i / 12 * Math.PI * 2 + .2, sx = 600 + Math.cos(an) * 700, sy = 310 + Math.sin(an) * 460;
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(600 + Math.cos(an + .7) * 300, 310 + Math.sin(an + .7) * 200, 600, 310);
      ctx.strokeStyle = 'rgba(194,239,255,.35)'; ctx.lineWidth = 4; ctx.stroke();
    }
    ctx.setLineDash([]);
  },
  mid(t, p, a) {
    for (let i = 0; i < 7; i++) {                                                      // galaxies riding the flow in
      const u = reduce ? i / 7 : (t * .05 + i / 7) % 1, an = i / 7 * Math.PI * 2 + 1, d = lerp(560, a.r * 1.1, u);
      const gx = 600 + Math.cos(an + (1 - u) * .7) * d, gy = 310 + Math.sin(an + (1 - u) * .7) * d * .66;
      galaxy(gx, gy, lerp(26, 10, u), '#2096c9', '#ffffff', t, .5, an, .6);
    }
    // the Great Attractor Magnet, hanging, wobbling
    hang(160, 70); ctx.save(); ctx.translate(160, 120); ctx.rotate(.3 + wob(t, 1.3, 0) * .12);
    const M = new Path2D(); M.moveTo(-50, 60); M.lineTo(-50, 0); M.arc(0, 0, 50, Math.PI, 0); M.lineTo(50, 60); M.lineTo(22, 60); M.lineTo(22, 0); M.arc(0, 0, 22, 0, Math.PI, true); M.lineTo(-22, 60); M.closePath();
    cut(M, '#ff5f5f', { lw: 4.5, d: 1 }); flat(P.rect(-50, 44, 28, 16), '#e3faff'); flat(P.rect(22, 44, 28, 16), '#e3faff'); ctx.lineWidth = 4.5; ctx.strokeStyle = INK; ctx.stroke(M);
    ctx.restore();
    sign(820, 80, 210, 52, 'ALL ROADS', 24, t, '#49c6f5', INK, 3);
    rocket(190, 530, .36, t);
  },
  front(t) { asteroid(60, 572, 28, reduce ? 0 : t * .1); asteroid(910, 560, 22, reduce ? 0 : -t * .14); },
};

import { P, cut, inked, flat, box, line, vgrad, hang, label, ctx, reduce, W, H, INK, EDGE, PAPER, FONT, clamp, lerp, easeOut, rng, mix } from '../draw.js';
import { STARS, space, porthole, flask, lamp, cloud, building, planet, asteroid } from './props.js';
import { faceStar, galaxy, blobGalaxy, sign, haze, stream, star5, bunting, wob } from './props2.js';
import { sciHead, scientist, bobY, pilot, heli, rocket, saucer } from '../sprites/scientist.js';
import { toaster, goopScientist, tinyHuman, tableRide } from '../sprites/act2.js';
import { goopColours } from '../sprites/goop.js';

const gone = (a, id) => !!(a.gone && a.gone.has(id));

export default { // 7: nebula nibbler (a star nursery, babies and all)
  goop: { x: 618, base: 318, grounded: false, r0: 114, r1: 224 }, hand: [168, 470],
  back(t) {
    space(t, '#2a1450', '#4a1d6e', [[220, 200, 320, 'rgba(255,154,216,.3)'], [820, 460, 320, 'rgba(86,225,255,.22)']]);
    haze(150, 170, 120, '#ff9ad8', .18); haze(860, 470, 110, '#56e1ff', .14); haze(520, 90, 90, '#fff3b0', .1);
  },
  mid(t, p, a) {
    for (const [px, h, w, ph] of [[64, 330, 46, 0], [130, 250, 40, 1], [196, 300, 36, 2]]) {   // the Pillars of Creation, in cardboard
      cut(P.poly([[px - w, 600], [px - w * .7, 600 - h + 30], [px - w * .2, 600 - h], [px + w * .4, 600 - h + 14], [px + w * .7, 600 - h + 50], [px + w, 600]]), '#8a5a3c', { lw: 4, d: 1 });
      const tw = reduce ? 1 : .6 + .4 * Math.sin(t * 4 + ph * 2);
      star5(px, 600 - h - 12, 9 * tw + 3, '#fff3b0', 0, 2.5);
    }
    if (!gone(a, 'cot')) {                                                               // a cot mobile of baby stars, turning
      hang(820, 40); line([[760, 70], [880, 70]], INK, 5); line([[760, 70], [880, 70]], '#f2a154', 2.5);
      for (let i = 0; i < 4; i++) { const an = (reduce ? 0 : t * .9) + i * Math.PI / 2, bx = 820 + Math.cos(an) * 60, by = 110 + Math.sin(an) * 10; line([[bx, 70], [bx, by - 16]], 'rgba(255,243,214,.7)', 1.6); faceStar(bx, by, 14, '#fff3b0', '#ffd23f', t, 'baby', i); }
    }
    for (let i = 0; i < 3; i++) { const u = reduce ? i / 3 : (t * .07 + i / 3) % 1; faceStar(300 + i * 30 + u * 140, 520 - u * 160, 17, '#fff3b0', '#ff9ad8', t, 'baby', i + 5); }  // baby stars, wandering off
    rocket(168, 498, .38, t);
  },
  front(t) {
    for (const [cx, cy, s, c] of [[60, 588, 1.4, '#ff9ad8'], [900, 578, 1.2, '#c9f3ff']]) {
      const C = new Path2D(); C.moveTo(cx - 46 * s, cy + 14 * s); C.arc(cx - 34 * s, cy, 16 * s, Math.PI * .6, Math.PI * 1.5); C.arc(cx - 8 * s, cy - 14 * s, 22 * s, Math.PI * 1.1, Math.PI * 1.9); C.arc(cx + 24 * s, cy - 4 * s, 18 * s, Math.PI * 1.4, Math.PI * .3); C.closePath();
      ctx.save(); ctx.translate(reduce ? 0 : Math.sin(t * .4 + cx) * 6, 0); cut(C, c, { lw: 3.5, d: 1.2 }); ctx.restore();
    }
  },
};

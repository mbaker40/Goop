import { P, cut, inked, flat, box, line, vgrad, hang, label, ctx, reduce, W, H, INK, EDGE, PAPER, FONT, clamp, lerp, easeOut, rng, mix } from '../draw.js';
import { STARS, space, porthole, flask, lamp, cloud, building, planet, asteroid } from './props.js';
import { faceStar, galaxy, blobGalaxy, sign, haze, stream, star5, bunting, wob } from './props2.js';
import { sciHead, scientist, bobY, pilot, heli, rocket, saucer } from '../sprites/scientist.js';
import { toaster, goopScientist, tinyHuman, tableRide } from '../sprites/act2.js';
import { goopColours } from '../sprites/goop.js';

const gone = (a, id) => !!(a.gone && a.gone.has(id));
const CMB = (() => { const r = rng(17); return Array.from({ length: 70 }, () => [r() * 2 - 1, r() * 2 - 1, .04 + r() * .09, r() < .5]); })();

export default { // 16: the observable universe (everything we can see)
  goop: { x: 640, base: 330, grounded: false, r0: 104, r1: 204 }, hand: [184, 520],
  back(t) {
    space(t, '#14122e', '#2a1c40', [[600, 140, 380, 'rgba(255,122,89,.16)']]);
    // the cosmic microwave background, as a hanging poster
    hang(330, 18); hang(890, 18);
    const E = P.ell(610, 150, 330, 120);
    cut(E, '#ffb36b', { lw: 5, d: .8 });
    ctx.save(); ctx.clip(E);
    for (const [cx, cy, cr, hot] of CMB) flat(P.ell(610 + cx * 330, 150 + cy * 120, cr * 330, cr * 180), hot ? '#ff5f5f' : '#56b4ff', reduce ? .5 : .4 + .2 * Math.sin(t + cx * 9));
    ctx.restore(); ctx.lineWidth = 5; ctx.strokeStyle = INK; ctx.stroke(E);
  },
  mid(t, p, a) {
    // the Light Cone Ladle, dipping in and out of the light cone
    const dip = reduce ? .5 : (Math.sin(t * 1.1) + 1) / 2;
    flat(P.poly([[150, 600], [300, 300], [450, 600]]), 'rgba(255,243,176,.1)');
    ctx.save(); ctx.translate(300, 300 + dip * 60); ctx.rotate(-.5 + dip * .3);
    line([[0, 0], [-130, -210]], INK, 14); line([[0, 0], [-130, -210]], '#c9cfdf', 7);
    const L = new Path2D(); L.arc(20, 22, 46, -.3, Math.PI + .3); L.closePath(); cut(L, '#c9cfdf', { lw: 4.5, d: 1 });
    flat(P.ell(20, 26, 36, 10), '#fff3b0', .9); ctx.restore();
    if (!gone(a, 'here')) {                                                           // you are here (you were)
      const by = reduce ? 0 : Math.sin(t * 2.4) * 6;
      sign(860, 380 + by, 150, 60, 'YOU ARE\nHERE', 20, t, '#ffd23f', INK, 1);
      cut(P.poly([[800, 420 + by], [830, 420 + by], [815, 448 + by]]), '#ffd23f', { lw: 3.5, d: .6 });
    }
    saucer(184, 548, .34, t);
  },
  front(t) { asteroid(60, 580, 26, reduce ? 0 : t * .15); asteroid(906, 586, 20, reduce ? 0 : -t * .2); },
};

import { P, cut, inked, flat, box, line, vgrad, hang, label, ctx, reduce, W, H, INK, EDGE, PAPER, FONT, clamp, lerp, easeOut, rng, mix } from '../draw.js';
import { STARS, space, porthole, flask, lamp, cloud, building, planet, asteroid } from './props.js';
import { sciHead, scientist, bobY, pilot, heli, rocket, saucer } from '../sprites/scientist.js';
import { FOOD } from '../sprites/food.js';
import { goopColours } from '../sprites/goop.js';

export default { // 3: seen from orbit
  goop: { x: 486, base: 450, grounded: true, r0: 62, r1: 218 }, hand: [206, 150],
  back(t) { space(t, '#1b1654', '#3b1f78', [[160, 120, 260, 'rgba(34,195,176,.22)'], [820, 220, 300, 'rgba(255,95,143,.2)']]); },
  mid(t, p, a) {
    planet(862, 118, 36, '#d9dbe8', () => { flat(P.circ(852, 108, 9), '#b3b7cc'); flat(P.circ(874, 128, 7), '#b3b7cc'); flat(P.circ(868, 100, 4), '#b3b7cc'); });
    hang(700, 84); cut(P.rect(650, 86, 34, 22, 2), '#49bff5', { lw: 3, d: .9 }); cut(P.rect(716, 86, 34, 22, 2), '#49bff5', { lw: 3, d: .9 }); cut(P.rect(684, 80, 32, 34, 5), '#c9cfdf', { lw: 3, d: .9 });
    rocket(150, 196, .4, t);
    const ex = 486, ey = 1596, er = 1150, E = P.circ(ex, ey, er);
    flat(P.circ(ex, ey, er + 18), 'rgba(120,214,255,.26)');
    cut(E, '#2f8fe8', { lw: 5, d: 0 });
    ctx.save(); ctx.clip(E);
    flat(P.ell(196, 540, 190, 62, -.16), '#4fc46a'); flat(P.ell(800, 548, 200, 60, .16), '#4fc46a'); flat(P.ell(520, 620, 130, 34), '#4fc46a'); flat(P.ell(70, 610, 80, 30), '#3fae5c');
    for (let i = 0; i < 5; i++) flat(P.ell(120 + i * 190 + (reduce ? 0 : Math.sin(t * .2 + i) * 14), 500 + (i % 2) * 54, 54, 12), '#ffffff', .8);
    const [col, shade] = goopColours(3, p);
    const spill = P.ell(486, 470, 130 + 430 * p, 34 + 96 * p);
    flat(spill, shade); ctx.lineWidth = 5; ctx.strokeStyle = INK; ctx.stroke(spill);
    flat(P.ell(486, 462, 110 + 400 * p, 24 + 80 * p), col);
    ctx.restore();
    ctx.lineWidth = 5; ctx.strokeStyle = INK; ctx.stroke(E);
  },
  front(t) { asteroid(52, 566, 34, reduce ? 0 : t * .1); asteroid(912, 548, 24, reduce ? 1 : 1 - t * .14); },
};

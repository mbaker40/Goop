import { P, cut, inked, flat, box, line, vgrad, hang, label, ctx, reduce, W, H, INK, EDGE, PAPER, FONT, clamp, lerp, easeOut, rng, mix } from '../draw.js';
import { STARS, space, porthole, flask, lamp, cloud, building, planet, asteroid } from './props.js';
import { sciHead, scientist, bobY, pilot, heli, rocket, saucer } from '../sprites/scientist.js';
import { FOOD } from '../sprites/food.js';
import { goopColours } from '../sprites/goop.js';

const gone = (a, id) => !!(a && a.gone && a.gone.has(id));   // props eaten by a milestone (milestones.js)

export default { // 4: a planet in its own right
  goop: { x: 512, base: 318, grounded: false, r0: 90, r1: 190 }, hand: [240, 280],
  back(t) { space(t, '#1a1450', '#4a1d6e', [[720, 420, 320, 'rgba(34,195,176,.2)'], [240, 140, 280, 'rgba(162,104,255,.26)']]); },
  ring(t, a, front) {
    for (let i = 0; i < 16; i++) {
      const an = i / 16 * Math.PI * 2 + (reduce ? 0 : t * .45), s = Math.sin(an);
      if ((s > 0) !== front) continue;
      const rx = Math.cos(an) * a.r * 1.62, ry = s * a.r * .36, cs = Math.cos(-.22), sn = Math.sin(-.22);
      const px = 512 + rx * cs - ry * sn, py = a.cy + rx * sn + ry * cs, q = 9 + (i * 7 % 5) * 3;
      if (i % 4 === 0) { cut(P.circ(px, py, q), i % 8 ? '#2f8fe8' : '#4fc46a', { lw: 3, d: .7 }); } else asteroid(px, py, q, an * 2);
    }
  },
  mid(t, p, a) {
    const pull = (x, i) => x + (512 - x) * .1 * p + (reduce ? 0 : Math.sin(t * 1.1 + i * 2) * 5);
    if (!gone(a, 'moon')) planet(pull(140, 0), 150, 30, '#d9dbe8', () => { flat(P.circ(pull(140, 0) - 9, 142, 8), '#b3b7cc'); flat(P.circ(pull(140, 0) + 10, 160, 6), '#b3b7cc'); });
    planet(pull(826, 1), 132, 40, '#e2633a', () => { flat(P.ell(pull(826, 1) - 6, 146, 30, 8), '#b8431f'); flat(P.circ(pull(826, 1) + 14, 116, 8), '#b8431f'); });
    planet(pull(852, 2), 466, 34, '#f2d38a', () => { box(700, 452, 300, 8, '#d9b060'); box(700, 472, 300, 10, '#d9b060'); });
    planet(pull(248, 3), 512, 22, '#b9a79a', () => flat(P.circ(pull(248, 3) + 5, 506, 6), '#93827a'));
    saucer(176, 318, .42, t);
    this.ring(t, a, false);
  },
  front(t, p, a) { this.ring(t, a, true); },
};

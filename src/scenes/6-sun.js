import { P, cut, inked, flat, box, line, vgrad, hang, label, ctx, reduce, W, H, INK, EDGE, PAPER, FONT, clamp, lerp, easeOut, rng, mix } from '../draw.js';
import { STARS, space, porthole, flask, lamp, cloud, building, planet, asteroid } from './props.js';
import { sciHead, scientist, bobY, pilot, heli, rocket, saucer } from '../sprites/scientist.js';
import { FOOD } from '../sprites/food.js';
import { goopColours } from '../sprites/goop.js';

const gone = (a, id) => !!(a && a.gone && a.gone.has(id));   // props eaten by a milestone (milestones.js)

export default { // 5: eating the sun
  goop: { x: 622, base: 312, grounded: false, r0: 118, r1: 232 }, hand: [336, 520],
  back(t, p, a) {
    space(t, '#24104f', '#5a1d6b', [[150, 330, 380, 'rgba(255,176,31,.3)'], [820, 500, 260, 'rgba(255,95,143,.2)']]);
    const g = ctx.createRadialGradient(622, 312, a.r * .6, 622, 312, a.r * 1.9); g.addColorStop(0, 'rgba(150,170,255,.55)'); g.addColorStop(1, 'rgba(150,170,255,0)');
    ctx.fillStyle = g; ctx.fillRect(622 - a.r * 2, 312 - a.r * 2, a.r * 4, a.r * 4);
  },
  mid(t, p, a) {
    planet(886, 122, 46, '#e8b98a', () => { box(820, 100, 140, 9, '#c98f5f'); box(820, 124, 140, 12, '#c98f5f'); box(820, 148, 140, 7, '#c98f5f'); flat(P.ell(900, 134, 12, 7), '#d95f3a'); });
    if (!gone(a, 'saturn')) { hang(392, 70); inked(P.ell(392, 100, 56, 13, -.25), '#f2d38a', 3.5); cut(P.circ(392, 100, 30), '#e8c46a', { lw: 4, d: 1.1 }); line([[366, 108], [420, 94]], '#c99a3a', 4); }
    const sr = a.won ? 0 : lerp(140, 64, p), sx = 152, sy = 330;
    if (sr > 4) {
      const rays = [];
      for (let i = 0; i < 28; i++) { const an = i / 28 * Math.PI * 2 + (reduce ? 0 : t * .2); const rr = sr * (i % 2 ? 1.06 : 1.36); rays.push([sx + Math.cos(an) * rr, sy + Math.sin(an) * rr]); }
      cut(P.poly(rays), '#ffd23f', { lw: 4, d: 1 });
      cut(P.circ(sx, sy, sr), '#ff9a1f', { lw: 5, d: .6 });
      for (const ex of [-.3, .22]) { inked(P.circ(sx + ex * sr, sy - sr * .16, sr * .17), '#ffffff', 3); flat(P.circ(sx + ex * sr + sr * .07, sy - sr * .14, sr * .08), INK); }
      line([[sx - sr * .5, sy - sr * .46], [sx - sr * .14, sy - sr * .38]], INK, 4); line([[sx + sr * .44, sy - sr * .46], [sx + sr * .08, sy - sr * .38]], INK, 4);
      line([[sx - sr * .3, sy + sr * .36], [sx - sr * .15, sy + sr * .26], [sx, sy + sr * .36], [sx + sr * .15, sy + sr * .26], [sx + sr * .28, sy + sr * .36]], INK, 4);
      for (let i = 0; i < 9; i++) {                      // the star, being drunk through a straw
        const u = reduce ? i / 9 : ((t * .32 + i / 9) % 1), v = 1 - u;
        const ax = sx + sr * .8, ay = sy - sr * .2, bx = 622 - a.r * .8, by = 312 + a.r * .25, qx = (ax + bx) / 2, qy = Math.min(ay, by) - 110;
        inked(P.circ(v * v * ax + 2 * v * u * qx + u * u * bx, v * v * ay + 2 * v * u * qy + u * u * by, lerp(17, 6, u)), '#ffb01f', 3);
      }
    }
    saucer(318, 532, .34, t);
  },
  front() {},
};

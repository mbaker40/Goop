import { P, cut, inked, flat, box, line, vgrad, hang, label, ctx, reduce, W, H, INK, EDGE, PAPER, FONT, clamp, lerp, easeOut, rng, mix } from '../draw.js';
import { STARS, space, porthole, flask, lamp, cloud, building, planet, asteroid } from './props.js';
import { sciHead, scientist, bobY, pilot, heli, rocket, saucer } from '../sprites/scientist.js';
import { FOOD } from '../sprites/food.js';
import { goopColours } from '../sprites/goop.js';

const gone = (a, id) => !!(a && a.gone && a.gone.has(id));   // props eaten by a milestone (milestones.js)

export default { // 0: on the lab table
  goop: { x: 590, base: 436, grounded: true, r0: 30, r1: 116 }, hand: [336, 256],
  back(t) {
    ctx.fillStyle = vgrad(0, H, '#8670d4', '#5b479f'); ctx.fillRect(-60, -60, W + 120, H + 120);
    box(-60, -60, W + 120, 104, '#4b3a8c'); box(-60, 40, W + 120, 12, '#6a58b6'); box(318, -60, 14, 104, '#6a58b6'); box(-60, 6, W + 120, 8, '#6a58b6');
    porthole(165, 206, 92);
    flat(P.rect(668, 104, 244, 156, 8), '#3f3080'); flat(P.rect(680, 116, 220, 132, 4), '#28564f');
    label('GOOP + SNACKS', 790, 150, 22, 'rgba(255,243,214,.86)', -.03); label('= MORE GOOP', 790, 180, 22, 'rgba(255,243,214,.86)', -.03);
    line([[706, 232], [740, 222], [770, 226], [806, 206], [840, 210], [874, 196]], 'rgba(255,243,214,.8)', 3); line([[860, 194], [874, 196], [868, 209]], 'rgba(255,243,214,.8)', 3);
  },
  mid(t, p, a) {
    lamp(590, 58, t);
    cut(P.rect(404, 286, 150, 14, 3), '#f2a154', { lw: 3.5, d: .8 });
    if (!gone(a, 'pinkFlask')) flask(432, 285, 52, '#ff5f8f');
    flask(480, 285, 40, '#ffd23f'); flask(524, 285, 58, '#22c3b0');
    (a.swap ? a.swap.scientist : scientist)(214, 570, 1, t, a.fling);   // the ending swaps the roles (see ending.js)
    cut(P.rect(-50, 436, W + 100, 240), '#d9772b', { lw: 5, d: 1.4 });
    box(-50, 438, W + 100, 22, '#f2a154'); line([[-50, 461], [W + 50, 461]], INK, 3);
    for (const [gx, gy, gw] of [[60, 500, 120], [320, 540, 160], [640, 512, 110], [780, 566, 130], [150, 578, 90]]) line([[gx, gy], [gx + gw, gy + 3]], '#b85f1f', 3);
    inked(P.ell(590, 440, 64 + a.r * .55, 9), 'rgba(227,250,255,.75)', 3);
  },
  front(t) {
    cut(P.rect(782, 528, 164, 90, 6), '#f2a154', { lw: 4, d: 1.8 });
    [['#ff5f8f', 808], ['#8fdc2f', 850], ['#ffd23f', 892]].forEach(([c, tx], i) => {
      const T = P.rect(tx, 470, 26, 92, 12); cut(T, '#e3faff', { lw: 3.5, d: 1.2 });
      ctx.save(); ctx.clip(T); box(tx, 508 + i * 8, 26, 60, c); ctx.restore(); ctx.lineWidth = 3.5; ctx.strokeStyle = INK; ctx.stroke(T);
    });
    box(784, 548, 160, 8, '#d9772b');
    const R = P.circ(62, 548, 46); cut(P.rect(48, 470, 28, 44, 4), '#e3faff', { lw: 4, d: 1.8 }); cut(R, '#e3faff', { lw: 4, d: 1.8 });
    ctx.save(); ctx.clip(R); box(0, 540 + (reduce ? 0 : Math.sin(t * 3) * 2), 130, 70, '#22c3b0'); ctx.restore(); ctx.lineWidth = 4; ctx.strokeStyle = INK; ctx.stroke(R);
  },
};

import { P, cut, inked, flat, box, line, vgrad, hang, label, ctx, reduce, W, H, INK, EDGE, PAPER, FONT, clamp, lerp, easeOut, rng, mix } from '../draw.js';
import { STARS, space, porthole, flask, lamp, cloud, building, planet, asteroid } from './props.js';
import { sciHead, scientist, bobY, pilot, heli, rocket, saucer } from '../sprites/scientist.js';
import { FOOD } from '../sprites/food.js';
import { goopColours } from '../sprites/goop.js';

const gone = (a, id) => !!(a && a.gone && a.gone.has(id));   // props eaten by a milestone (milestones.js)

export default { // 2: downtown
  goop: { x: 540, base: 570, grounded: true, r0: 74, r1: 228 }, hand: [240, 150],
  back(t) {
    ctx.fillStyle = vgrad(0, H, '#49bff5', '#cdf1ff'); ctx.fillRect(-60, -60, W + 120, H + 120);
    flat(P.circ(806, 112, 86), '#fff3b0', .35); flat(P.circ(806, 112, 58), '#fff3b0');
    [[-30, 90, 300], [70, 60, 380], [140, 110, 330], [262, 70, 290], [340, 100, 350], [450, 80, 300], [540, 120, 360], [668, 70, 310], [744, 96, 372], [850, 80, 320], [930, 90, 356]].forEach(([bx, bw, top], i) => flat(P.rect(bx, top, bw, 400), i % 2 ? '#8cc4f2' : '#a6d6f7'));
    flat(P.ell(180, 620, 440, 110), '#6fd08c'); flat(P.ell(820, 630, 480, 110), '#58c27d');
  },
  mid(t, p, a) {
    [[330, 92, 1], [640, 70, .8], [80, 60, .7]].forEach(([cx, cy2, cs], i) => cloud(cx + (reduce ? 0 : Math.sin(t * .25 + i * 2) * 16), cy2, cs));
    const lean = .015 + .075 * p;
    building(14, 226, 118, '#ff7a59', -lean * .6, 3); building(146, 334, 96, '#22c3b0', -lean * 1.5, 4);
    building(850, 204, 112, '#ff5f8f', lean * .6, 3); building(742, 306, 100, '#ffd23f', lean * 1.5, 4);
    heli(176, 126, .46, t);
    box(-60, 570, W + 120, 90, '#4a4470'); for (let i = 0; i < 12; i++) box(i * 90 - 30, 586, 44, 6, 'rgba(255,243,214,.55)');
    for (const dir of [-1, 1]) {                         // the lab, split in two by what it was holding
      ctx.save(); ctx.translate(540 + dir * (a.r * 1.18 + 58), 578); ctx.rotate(dir * (.1 + .32 * p));
      cut(P.poly([[-52, 0], [-52, -150], [20, -150], [44, -120], [26, -96], [50, -66], [38, -36], [52, 0]].map(q => [-dir * q[0], q[1]])), '#7a5cd6', { lw: 4, d: 1 });
      for (let j = 0; j < 3; j++) flat(P.rect(dir < 0 ? -38 : 14, -132 + j * 40, 24, 22, 2), '#fff3b0');
      if (dir < 0) { cut(P.rect(-58, -182, 78, 28, 4), PAPER, { lw: 3.5, d: .6 }); label('LAB', -19, -167, 20, INK); }
      ctx.restore();
    }
  },
  front(t, p, a) {
    for (let i = 0; i < 2; i++) {                        // traffic, leaving
      const dir = i ? 1 : -1, u = reduce ? .3 + i * .3 : ((t * .09 + i * .5) % 1), cx = dir > 0 ? 620 + u * 420 : 460 - u * 520;
      ctx.save(); ctx.translate(cx, 578); ctx.scale(dir * .9, .9); FOOD[2][i](); ctx.restore();
    }
    if (!gone(a, 'tree')) {
      line([[70, 606], [70, 524]], INK, 12); line([[70, 606], [70, 524]], '#b98852', 6);
      cut(P.circ(70, 500, 40), '#3fbf6a', { lw: 4, d: 1.8 }); cut(P.circ(40, 524, 26), '#3fbf6a', { lw: 4, d: 1.8 }); cut(P.circ(100, 526, 24), '#3fbf6a', { lw: 4, d: 1.8 });
    }
    line([[900, 606], [900, 480]], INK, 9); line([[900, 606], [900, 480]], '#8f9bb8', 4); cut(P.ell(900, 474, 20, 11), '#fff3b0', { lw: 3.5, d: 1.6 });
  },
};

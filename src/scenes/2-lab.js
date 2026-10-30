import { P, cut, inked, flat, box, line, vgrad, hang, label, ctx, reduce, W, H, INK, EDGE, PAPER, FONT, clamp, lerp, easeOut, rng, mix } from '../draw.js';
import { STARS, space, porthole, flask, lamp, cloud, building, planet, asteroid } from './props.js';
import { sciHead, scientist, bobY, pilot, heli, rocket, saucer } from '../sprites/scientist.js';
import { FOOD } from '../sprites/food.js';
import { goopColours } from '../sprites/goop.js';

export default { // 1: loose in the lab (same room, camera pulled back)
  goop: { x: 566, base: 516, grounded: true, r0: 62, r1: 212 }, hand: [322, 268],
  back(t) {
    ctx.fillStyle = vgrad(0, H, '#8670d4', '#5b479f'); ctx.fillRect(-60, -60, W + 120, H + 120);
    box(-60, -60, W + 120, 86, '#4b3a8c'); box(-60, 30, W + 120, 9, '#6a58b6'); box(-60, 50, W + 120, 6, '#6a58b6');
    porthole(110, 172, 44); porthole(826, 168, 44);
    flat(P.rect(686, 286, 104, 240, 6), '#4b3a8c'); flat(P.rect(708, 308, 60, 60, 4), '#1f2468'); flat(P.circ(772, 420, 6), '#ffd23f');
    flat(P.rect(338, 132, 124, 82, 6), '#3f3080'); flat(P.rect(346, 140, 108, 66, 3), '#28564f'); line([[360, 190], [386, 172], [410, 178], [440, 154]], 'rgba(255,243,214,.8)', 2.5);
    box(-60, 516, W + 120, 150, '#3a2c72');
    for (let i = 0; i < 9; i++) flat(P.poly([[i * 130 - 80, 516], [i * 130 - 20, 516], [i * 150 - 150, H + 60], [i * 150 - 230, H + 60]]), '#4b3a8c');
  },
  mid(t, p, a) {
    lamp(566, 44, t);
    if (p > .4) { const d = (p - .4) / .6; line([[520, -10], [540, 40 + 40 * d], [512, 70 + 70 * d], [548, 100 + 110 * d]], INK, 4); line([[640, -10], [626, 30 + 30 * d], [660, 60 + 60 * d]], INK, 4); }
    hang(840, 250, 846); cut(P.poly([[840, 250], [884, 294], [840, 338], [796, 294]]), '#ffd23f', { lw: 4, d: 1 }); label('!', 840, 296, 46, INK);
    cut(P.rect(34, 372, 176, 150, 10), '#22c3b0', { lw: 4, d: 1 });
    flat(P.rect(52, 390, 92, 56, 5), '#123b4a'); line([[60, 432], [78, 414], [96, 424], [114, 402], [134, 408]], '#8fdc2f', 3);
    for (let i = 0; i < 6; i++) inked(P.circ(62 + (i % 3) * 30, 468 + Math.floor(i / 3) * 26, 8), (reduce ? i % 2 : Math.floor(t * 2 + i * 1.3) % 2) ? '#ff5f8f' : '#ffd23f', 3);
    line([[176, 400], [190, 366]], INK, 7); inked(P.circ(191, 362, 10), '#ff5f5f', 3);
    const T = P.rect(848, 318, 88, 204, 40); cut(T, '#e3faff', { lw: 4, d: 1 });
    ctx.save(); ctx.clip(T); box(840, 400 + (reduce ? 0 : Math.sin(t * 2) * 3), 110, 130, '#8fdc2f');
    for (let i = 0; i < 4; i++) { const u = (t * .3 + i * .27) % 1; flat(P.circ(866 + i * 18, 516 - u * 110, 5), '#e3faff', .8); } ctx.restore();
    ctx.lineWidth = 4; ctx.strokeStyle = INK; ctx.stroke(T);
    for (const lx of [226, 302]) { line([[lx, 524], [lx + (lx < 260 ? 14 : -14), 380]], INK, 11); line([[lx, 524], [lx + (lx < 260 ? 14 : -14), 380]], '#f2a154', 5); }
    for (const ry of [500, 468, 436, 404]) { line([[230 + (524 - ry) * .1, ry], [298 - (524 - ry) * .1, ry]], INK, 10); line([[230 + (524 - ry) * .1, ry], [298 - (524 - ry) * .1, ry]], '#f2a154', 4.5); }
    scientist(262, 404, .52, t, a.fling);
    for (const dir of [-1, 1]) { ctx.save(); ctx.translate(566 + dir * (a.r * 1.5 + 36), 506); ctx.rotate(dir * (.5 + .3 * p)); cut(P.rect(-46, -8, 92, 16, 3), '#d9772b', { lw: 3.5, d: .6 }); ctx.restore(); }
  },
  front(t, p) {
    const C = P.rect(-16, 528, 132, 100, 6); cut(C, '#f2a154', { lw: 4, d: 1.8 }); line([[-16, 560], [116, 560]], INK, 3); line([[50, 528], [50, 628]], INK, 3);
    cut(P.rect(866, 520, 110, 110, 16), '#ffd23f', { lw: 4, d: 1.8 }); inked(P.circ(920, 566, 22), INK, 2); flat(P.circ(920, 566, 8), '#ffd23f');
    if (p > .75) for (let i = 0; i < 3; i++) { const u = (t * .5 + i * .37) % 1; ctx.save(); ctx.translate(430 + i * 120, -20 + u * 400); ctx.rotate(u * 4 + i); cut(P.poly([[-12, -8], [10, -12], [14, 8], [-8, 12]]), '#6a58b6', { lw: 3, d: .6 }); ctx.restore(); }
  },
};

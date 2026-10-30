import { P, cut, inked, flat, box, line, vgrad, hang, label, ctx, reduce, W, H, INK, EDGE, PAPER, FONT, clamp, lerp, easeOut, rng, mix } from '../draw.js';
import { STARS, space, porthole, flask, lamp, cloud, building, planet, asteroid } from './props.js';
import { faceStar, galaxy, blobGalaxy, sign, haze, stream, star5, bunting, wob } from './props2.js';
import { sciHead, scientist, bobY, pilot, heli, rocket, saucer } from '../sprites/scientist.js';
import { toaster, goopScientist, tinyHuman, tableRide } from '../sprites/act2.js';
import { goopColours } from '../sprites/goop.js';


// Bites out of the theatre's own frame, growing through the stage (p) and finished by the end.
const BITES = [[960, 120, 70, .05], [0, 430, 80, .2], [300, 0, 64, .35], [960, 480, 90, .5], [700, 600, 76, .62], [0, 90, 60, .75], [620, 0, 84, .85], [150, 600, 70, .95]];
export function bitesAt(p, ate) { return BITES.filter(b => ate || p >= b[3]); }

export default { // 19: the fourth wall (time, physics, and the game's own interface)
  goop: { x: 560, base: 308, grounded: false, r0: 116, r1: 226 }, hand: [228, 376],
  back(t) {
    ctx.fillStyle = vgrad(0, H, '#3b2e6c', '#2b2150'); ctx.fillRect(-60, -60, W + 120, H + 120);
    for (let i = 0; i < 4; i++) {                                                     // spotlights, sweeping
      const sx = 150 + i * 220, sw = reduce ? 0 : Math.sin(t * .6 + i * 1.7) * 120;
      flat(P.poly([[sx - 18, -20], [sx + 18, -20], [sx + sw + 110, H + 40], [sx + sw - 110, H + 40]]), 'rgba(255,243,176,.07)');
    }
    for (let i = 0; i < 12; i++) line([[-60, 520 + i * 14], [W + 60, 520 + i * 14]], 'rgba(42,24,56,.35)', 2);   // the stage boards
    flat(P.rect(-60, 512, W + 120, 200), '#b98852'); for (let i = 0; i < 9; i++) line([[i * 120 - 40, 512], [i * 140 - 80, H + 60]], '#9a6e3e', 3);
  },
  mid(t, p, a) {
    for (const d of [-1, 1]) {                                                        // the curtains, swaying
      const x0 = d < 0 ? -40 : W + 40, sw = reduce ? 0 : Math.sin(t * .8 + d) * 10;
      const C = new Path2D(); C.moveTo(x0, -20); C.lineTo(x0 - d * (150 + sw), -20); C.quadraticCurveTo(x0 - d * (90 + sw), 260, x0 - d * (130 + sw), 620); C.lineTo(x0, 620); C.closePath();
      cut(C, '#d92b4f', { lw: 5, d: 1.2 });
      for (let i = 1; i < 4; i++) line([[x0 - d * i * 34, -20], [x0 - d * (i * 30 + sw * .5), 620]], '#a81d3c', 4);
    }
    scientist(168, 512, .5, t, a.fling);
    label('?', 214, 330 + (reduce ? 0 : Math.sin(t * 2) * 5), 40, '#ffd23f');
  },
  front(t, p, a) {
    cut(P.rect(-30, -30, W + 60, 54, 4), '#d92b4f', { lw: 5, d: 1.4 });               // the valance
    for (let i = 0; i < 12; i++) inked(P.circ(i * 86 + 20, 26, 10), '#ffd23f', 3);
    // crumbs falling from the bites, and the bites themselves (the backdrop's own colour, with a bitten edge)
    for (const [bx, by, br] of bitesAt(p, a.ate)) {
      const B = new Path2D(); for (let i = 0; i <= 10; i++) { const an = i / 10 * Math.PI * 2, rr = br * (i % 2 ? .84 : 1); i ? B.lineTo(bx + Math.cos(an) * rr, by + Math.sin(an) * rr) : B.moveTo(bx + Math.cos(an) * rr, by + Math.sin(an) * rr); } B.closePath();
      inked(B, '#120c26', 5);
      for (let i = 0; i < 2; i++) { const u = reduce ? .5 : (t * .5 + i * .5 + bx * .001) % 1; flat(P.rect(bx + (i - .5) * br * .6, by + br * .6 + u * 120, 7, 7, 1), '#b98852', 1 - u); }
    }
  },
};

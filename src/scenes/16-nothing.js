import { P, cut, inked, flat, box, line, vgrad, hang, label, ctx, reduce, W, H, INK, EDGE, PAPER, FONT, clamp, lerp, easeOut, rng, mix } from '../draw.js';
import { STARS, space, porthole, flask, lamp, cloud, building, planet, asteroid } from './props.js';
import { faceStar, galaxy, blobGalaxy, sign, haze, stream, star5, bunting, wob } from './props2.js';
import { sciHead, scientist, bobY, pilot, heli, rocket, saucer } from '../sprites/scientist.js';
import { toaster, goopScientist, tinyHuman, tableRide } from '../sprites/act2.js';
import { goopColours } from '../sprites/goop.js';


// The Judgmental Toaster drifts across, left to right, about once a minute.
export function toasterAt(t) { const u = reduce ? .3 : (t / 62) % 1; return [lerp(-120, 1080, u), 150 + Math.sin(u * Math.PI * 2) * 40]; }

export default { // 15: eating the nothing (the voids between everything)
  goop: { x: 600, base: 320, grounded: false, r0: 108, r1: 212 }, hand: [184, 500],
  back(t) {
    ctx.fillStyle = vgrad(0, H, '#0c0a1c', '#1c1830'); ctx.fillRect(-60, -60, W + 120, H + 120);
    for (let i = 0; i < 12; i++) { const [sx, sy, sr] = STARS[i * 7]; flat(P.circ(sx, sy, sr), PAPER, .5); }
    ctx.setLineDash([8, 10]); ctx.lineWidth = 3;                                      // outlines of things that used to be here
    [[160, 140, 50], [820, 470, 60], [300, 520, 36], [860, 120, 34]].forEach(([x, y, r], i) => {
      ctx.globalAlpha = reduce ? .4 : .2 + .25 * (Math.sin(t * .8 + i * 2) + 1) / 2; ctx.strokeStyle = PAPER;
      ctx.beginPath(); ctx.ellipse(x, y, r, r * .5, .3, 0, 7); ctx.stroke();
    });
    ctx.setLineDash([]); ctx.globalAlpha = 1;
  },
  mid(t, p, a) {
    // the Vacuum Straw, from the top of the theatre into the goop
    const mx = 600 - a.r * .1, my = a.cy - a.r * .9;
    line([[420, -40], [mx, my]], INK, 30); line([[420, -40], [mx, my]], '#ff5f8f', 20); line([[420, -40], [mx, my]], '#ffffff', 4);
    for (let i = 0; i < 6; i++) { const u = reduce ? i / 6 : (t * .4 + i / 6) % 1; flat(P.circ(lerp(420, mx, u), lerp(-40, my, u), 4), '#f4f1ff', .7); }
    const [tx, ty] = toasterAt(t), pop = reduce ? 0 : Math.max(0, Math.sin(t * 1.3)) ** 6;   // the toaster, drifting and judging
    hang(tx, ty - 70, tx);
    toaster(tx, ty, .9, t, { lookX: clamp((600 - tx) / 300, -1, 1), lookY: .4, pop });
    rocket(184, 530, .36, t);
  },
  front(t) {
    for (let i = 0; i < 9; i++) { const u = reduce ? i / 9 : (t * .03 + i / 9) % 1; flat(P.circ(60 + i * 100, 600 - u * 640, 2.5), PAPER, .4); }   // dust motes, drifting up
  },
};

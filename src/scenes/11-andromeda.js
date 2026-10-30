import { P, cut, inked, flat, box, line, vgrad, hang, label, ctx, reduce, W, H, INK, EDGE, PAPER, FONT, clamp, lerp, easeOut, rng, mix } from '../draw.js';
import { STARS, space, porthole, flask, lamp, cloud, building, planet, asteroid } from './props.js';
import { faceStar, galaxy, blobGalaxy, sign, haze, stream, star5, bunting, wob } from './props2.js';
import { sciHead, scientist, bobY, pilot, heli, rocket, saucer } from '../sprites/scientist.js';
import { toaster, goopScientist, tinyHuman, tableRide } from '../sprites/act2.js';
import { goopColours } from '../sprites/goop.js';


// Andromeda arrives halfway through the stage (the "Signed for Andromeda" milestone sits at 0.5).
export const ARRIVE = .5;
export function andromedaX(p) { return lerp(1180, 228, easeOut(clamp(p / ARRIVE, 0, 1))); }

export default { // 10: Andromeda delivery (arrives early, uninvited)
  goop: { x: 640, base: 318, grounded: false, r0: 110, r1: 214 }, hand: [776, 520],
  back(t) { space(t, '#1a1046', '#3a1a5c', [[220, 260, 320, 'rgba(226,63,209,.2)'], [800, 120, 240, 'rgba(255,210,63,.15)']]); },
  mid(t, p, a) {
    const ax = andromedaX(p), ay = 270 + (reduce ? 0 : Math.sin(t * 1.2) * 6), here = p >= ARRIVE;
    if (ax < 1100) {
      line([[ax + 70, ay + 30], [ax + 230, ay + 60]], 'rgba(255,243,214,.5)', 3);   // speed lines while it is still on its way
      cut(P.rect(ax - 120, ay + 40, 240, 74, 8), '#d9b98a', { lw: 4, d: 1.2 });       // the delivery box it is sitting in
      line([[ax - 120, ay + 76], [ax + 120, ay + 76]], '#b98852', 4);
      label('FRAGILE: GALAXY', ax, ay + 98, 18, INK);
      galaxy(ax, ay, 118, '#b01fa3', '#ffd6f0', t, .42, -.35, .25);
      const sw = wob(t, 3, 1) * .12;                                                     // the receipt, fluttering
      ctx.save(); ctx.translate(ax + 110, ay + 50); ctx.rotate(.2 + sw);
      cut(P.rect(0, 0, 70, 96, 3), PAPER, { lw: 3, d: .6 });
      for (let i = 0; i < 5; i++) line([[10, 16 + i * 14], [i % 2 ? 46 : 60, 16 + i * 14]], INK, 2);
      label('1x', 22, 86, 14, INK); ctx.restore();
      galaxy(ax + 150, ay - 130, 34, '#3b6cff', '#ffffff', t, .6, .3, .5);            // Triangulum, tagging along
    }
    if (p > ARRIVE - .12 && p < ARRIVE + .1 && !reduce) {                              // ding dong
      const k = Math.sin(t * 8) > 0;
      label(k ? 'DING' : 'DONG', 400, 120, 46, '#ffd23f', k ? -.15 : .15);
    }
    if (here) sign(470, 76, 210, 52, 'SIGNED FOR', 24, t, '#8fdc2f', INK, 2);
    saucer(776, 548, .34, t);
  },
  front(t) {
    asteroid(900, 566, 26, reduce ? 0 : t * .15);
    cut(P.rect(16, 540, 120, 70, 6), '#d9b98a', { lw: 4, d: 1.6 }); line([[16, 572], [136, 572]], '#b98852', 4);   // an empty box, already eaten out of
  },
};

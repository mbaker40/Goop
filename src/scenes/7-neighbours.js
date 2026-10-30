import { P, cut, inked, flat, box, line, vgrad, hang, label, ctx, reduce, W, H, INK, EDGE, PAPER, FONT, clamp, lerp, easeOut, rng, mix } from '../draw.js';
import { STARS, space, porthole, flask, lamp, cloud, building, planet, asteroid } from './props.js';
import { faceStar, galaxy, blobGalaxy, sign, haze, stream, star5, bunting, wob } from './props2.js';
import { sciHead, scientist, bobY, pilot, heli, rocket, saucer } from '../sprites/scientist.js';
import { toaster, goopScientist, tinyHuman, tableRide } from '../sprites/act2.js';
import { goopColours } from '../sprites/goop.js';

const gone = (a, id) => !!(a.gone && a.gone.has(id));

export default { // 6: neighbourhood watch (Alpha Centauri, Sirius, the local stars)
  goop: { x: 612, base: 316, grounded: false, r0: 112, r1: 222 }, hand: [318, 506],
  back(t) {
    space(t, '#141a5c', '#33206e', [[180, 330, 300, 'rgba(255,210,63,.22)'], [860, 120, 260, 'rgba(86,225,255,.2)']]);
    for (let i = 0; i < 7; i++) flat(P.circ(60 + i * 140, 560 - (i % 3) * 20, 4), '#fff3b0', .6);
  },
  mid(t, p, a) {
    sign(176, 92, 236, 66, 'NEIGHBOURHOOD\nWATCH', 22, t, '#ffd23f');            // swaying
    inked(P.ell(274, 92, 14, 9), '#ffffff', 3); flat(P.circ(276, 92, 4.5), INK);
    const c = reduce ? 0 : t * .8, ox = 176, oy = 300;                                     // Alpha Centauri A and B, orbiting each other
    for (const [d, col, rr, mood] of [[1, '#ffd23f', 34, 'worried'], [-1, '#ffb01f', 26, 'worried']]) faceStar(ox + Math.cos(c) * 46 * d, oy + Math.sin(c) * 20 * d, rr, col, '#fff3b0', t, mood, d);
    if (!gone(a, 'proxima')) { const tw = reduce ? 1 : .7 + .3 * Math.sin(t * 5); faceStar(84, 410, 14 * tw + 4, '#ff5f5f', '#ff9a8a', t, 'calm', 2); label('Proxima', 84, 446, 15, 'rgba(255,243,214,.8)'); }
    hang(866, 104); faceStar(866, 150, 40 + (reduce ? 0 : Math.sin(t * 6) * 2), '#e3faff', '#9fe8ff', t, 'worried', 4);   // Sirius, twinkling
    inked(P.circ(918, 200, 9), '#ffffff', 3);
    stream(ox + 40, oy, 612 - a.r * .85, a.cy + a.r * .2, t, '#fff3b0', 8, 13, 120, .3);
    saucer(318, 532, .36, t);
  },
  front(t) {
    line([[44, 640], [44, 470]], INK, 12); line([[44, 640], [44, 470]], '#8f9bb8', 6);       // a street lamp, because it is a neighbourhood
    cut(P.poly([[18, 470], [70, 470], [58, 444], [30, 444]]), '#3b2a63', { lw: 4, d: 1.4 });
    flat(P.poly([[30, 472], [58, 472], [120, 600], [-30, 600]]), 'rgba(255,240,170,.16)');
    inked(P.ell(44, 472, 14, 5), '#fff3b0', 3);
    asteroid(910, 560, 28, reduce ? 0 : t * .12);
  },
};

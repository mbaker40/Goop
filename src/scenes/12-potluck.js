import { P, cut, inked, flat, box, line, vgrad, hang, label, ctx, reduce, W, H, INK, EDGE, PAPER, FONT, clamp, lerp, easeOut, rng, mix } from '../draw.js';
import { STARS, space, porthole, flask, lamp, cloud, building, planet, asteroid } from './props.js';
import { faceStar, galaxy, blobGalaxy, sign, haze, stream, star5, bunting, wob } from './props2.js';
import { sciHead, scientist, bobY, pilot, heli, rocket, saucer } from '../sprites/scientist.js';
import { toaster, goopScientist, tinyHuman, tableRide } from '../sprites/act2.js';
import { goopColours } from '../sprites/goop.js';

const gone = (a, id) => !!(a.gone && a.gone.has(id));

export default { // 11: Local Group potluck (fifty dwarf galaxies, mostly crumbs)
  goop: { x: 600, base: 300, grounded: false, r0: 108, r1: 206 }, hand: [184, 300],
  back(t) {
    space(t, '#16123e', '#3a2060', [[480, 520, 420, 'rgba(255,179,107,.2)']]);
    // the picnic blanket, in perspective
    const B = P.poly([[60, 470], [900, 470], [1010, 640], [-50, 640]]);
    flat(B, '#ff5f5f');
    ctx.save(); ctx.clip(B); for (let i = 0; i < 14; i++) flat(P.rect(-60 + i * 80, 460, 40, 200), '#fff3d6', .55); for (let j = 0; j < 4; j++) flat(P.rect(-60, 480 + j * 44, 1100, 20), '#fff3d6', .45); ctx.restore();
  },
  mid(t, p, a) {
    bunting(-10, 40, 970, 40, t, ['#ffd23f', '#22c3b0', '#ff5f8f', '#8fdc2f']);
    // the casserole, steaming
    cut(P.rect(110, 470, 150, 54, 12), '#ff7a59', { lw: 4, d: 1 }); inked(P.ell(185, 470, 74, 16), '#ffd48f', 3.5);
    for (const hx of [104, 266]) inked(P.ell(hx, 492, 12, 8), '#ff7a59', 3);
    for (let i = 0; i < 3; i++) { const u = reduce ? .5 : (t * .4 + i / 3) % 1; ctx.globalAlpha = Math.sin(u * Math.PI) * .7; line([[160 + i * 24, 450 - u * 80], [168 + i * 24 + Math.sin(u * 8) * 8, 430 - u * 80]], PAPER, 5); ctx.globalAlpha = 1; }
    if (!gone(a, 'salad')) { inked(P.ell(860, 492, 64, 26), '#c9f3ff', 4); for (const [sx, sy] of [[-24, -6], [0, -12], [22, -4], [-8, 4], [14, 6]]) inked(P.circ(860 + sx, 486 + sy, 9), '#ffe9a8', 2.5); }
    // dwarf galaxies on paper plates, with name cards
    [[330, 520, 'Draco', 1], [430, 560, 'Sculptor', 2], [770, 560, 'Fornax', 3]].forEach(([px, py, nm, sd]) => {
      inked(P.ell(px, py, 44, 12), '#ffffff', 3); blobGalaxy(px, py - 10, 24, '#ffb36b', sd, t);
      line([[px + 30, py - 4], [px + 30, py - 40]], INK, 2); cut(P.rect(px + 14, py - 60, 54, 22, 3), PAPER, { lw: 2.5, d: .3 }); label(nm, px + 41, py - 49, 12, INK);
    });
    rocket(184, 330, .36, t);
  },
  front(t) {
    cut(P.rect(870, 540, 70, 80, 10), '#c9f3ff', { lw: 4, d: 1.6 });                 // a juice box for the goop
    line([[920, 540], [940, 500]], INK, 6); line([[920, 540], [940, 500]], '#ff5f8f', 3);
  },
};

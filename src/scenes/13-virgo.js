import { P, cut, inked, flat, box, line, vgrad, hang, label, ctx, reduce, W, H, INK, EDGE, PAPER, FONT, clamp, lerp, easeOut, rng, mix } from '../draw.js';
import { STARS, space, porthole, flask, lamp, cloud, building, planet, asteroid } from './props.js';
import { faceStar, galaxy, blobGalaxy, sign, haze, stream, star5, bunting, wob } from './props2.js';
import { sciHead, scientist, bobY, pilot, heli, rocket, saucer } from '../sprites/scientist.js';
import { toaster, goopScientist, tinyHuman, tableRide } from '../sprites/act2.js';
import { goopColours } from '../sprites/goop.js';


export default { // 12: Virgo supercluster (a thousand galaxy clusters)
  goop: { x: 640, base: 306, grounded: false, r0: 108, r1: 208 }, hand: [770, 520],
  back(t) {
    space(t, '#0f1a3e', '#203a5a', [[220, 220, 300, 'rgba(95,232,168,.2)'], [800, 480, 300, 'rgba(73,198,245,.18)']]);
    const sr = rng(13); for (let i = 0; i < 14; i++) blobGalaxy(sr() * 960, sr() * 600, 10 + sr() * 12, '#c4ffe4', i, t);
  },
  mid(t, p, a) {
    // M87, a big elliptical with a jet that pulses
    hang(860, 60); cut(P.ell(860, 120, 70, 50), '#f4e6c4', { lw: 4, d: 1 }); flat(P.ell(860, 120, 40, 28), '#fff3d6'); flat(P.circ(860, 120, 10), '#ffffff');
    const jet = reduce ? 1 : .6 + .4 * Math.sin(t * 4);
    cut(P.poly([[880, 112], [960, 60 - jet * 20], [966, 74], [884, 124]]), '#56e1ff', { lw: 3, d: .5 });
    label('M87', 860, 186, 18, 'rgba(255,243,214,.85)');
    // the Cluster Compactor: a press that squashes clusters into cubes, and a belt to the goop
    cut(P.rect(40, 250, 210, 180, 10), '#8f9bb8', { lw: 4.5, d: 1.2 });
    label('COMPACTOR', 145, 278, 20, INK);
    const press = reduce ? .5 : (Math.sin(t * 2.2) + 1) / 2;
    line([[145, 230], [145, 300 + press * 50]], INK, 12); line([[145, 230], [145, 300 + press * 50]], '#c9cfdf', 6);
    cut(P.rect(95, 300 + press * 50, 100, 18, 4), '#3b2a63', { lw: 3.5, d: .6 });
    blobGalaxy(145, 396 - press * 4, 30 * (1.1 - press * .5), '#c4ffe4', 99, t);
    cut(P.rect(250, 410, 330, 22, 10), '#3b2a63', { lw: 4, d: .8 });                  // conveyor
    for (let i = 0; i < 6; i++) flat(P.circ(268 + i * 58, 421, 7), '#8f9bb8');
    for (let i = 0; i < 4; i++) {
      const u = reduce ? i / 4 : (t * .15 + i / 4) % 1, cx = 260 + u * 300;
      ctx.save(); ctx.translate(cx, 392); cut(P.rect(-14, -14, 28, 28, 3), i % 2 ? '#5fe8a8' : '#a6f4e9', { lw: 3, d: .4 }); ctx.restore();
    }
    saucer(770, 548, .34, t);
  },
  front(t) { asteroid(900, 570, 24, reduce ? 0 : -t * .2); line([[60, 430], [60, 640]], INK, 12); line([[60, 430], [60, 640]], '#8f9bb8', 6); line([[230, 430], [230, 640]], INK, 12); line([[230, 430], [230, 640]], '#8f9bb8', 6); },
};

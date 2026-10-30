import { P, cut, inked, flat, box, line, vgrad, hang, label, ctx, reduce, W, H, INK, EDGE, PAPER, FONT, clamp, lerp, easeOut, rng, mix } from '../draw.js';
import { STARS, space, porthole, flask, lamp, cloud, building, planet, asteroid } from './props.js';
import { faceStar, galaxy, blobGalaxy, sign, haze, stream, star5, bunting, wob } from './props2.js';
import { sciHead, scientist, bobY, pilot, heli, rocket, saucer } from '../sprites/scientist.js';
import { toaster, goopScientist, tinyHuman, tableRide } from '../sprites/act2.js';
import { goopColours } from '../sprites/goop.js';


export default { // 8: black hole buffet (Sagittarius A*, which tries to eat back)
  goop: { x: 640, base: 314, grounded: false, r0: 110, r1: 214 }, hand: [770, 512],
  back(t) { space(t, '#0e0a2a', '#2a1040', [[220, 300, 360, 'rgba(255,154,31,.22)'], [860, 140, 240, 'rgba(162,104,255,.2)']]); },
  mid(t, p, a) {
    const bx = 214, by = 300, s = lerp(1.15, .62, p);                                   // it loses the staring contest as the goop grows
    const bite = reduce ? .5 : (Math.sin(t * 1.6) + 1) / 2;                             // and keeps lunging for a bite
    // the goop being pulled toward it, a drop at a time
    const [col] = goopColours(8, p);
    for (let i = 0; i < 9; i++) {
      const u = reduce ? i / 9 : (t * .25 + i / 9) % 1, sp = (1 - u);
      const ang = u * 7 + i, rr = lerp(a.r * .9 + 40, 20, u);
      const sx = lerp(640 - a.r * .8, bx, u) + Math.cos(ang) * rr * .25 * sp, sy = lerp(a.cy, by, u) + Math.sin(ang) * rr * .25 * sp;
      inked(P.circ(sx, sy, lerp(13, 4, u)), col, 3);
    }
    ctx.save(); ctx.translate(bx, by); ctx.scale(s, s);
    ctx.save(); ctx.rotate(-.25); ctx.scale(1, .32);
    cut(P.circ(0, 0, 150), '#ff9a1f', { lw: 6, d: .6 });
    for (let i = 0; i < 14; i++) { const an = i / 14 * Math.PI * 2 + (reduce ? 0 : t * 1.2); flat(P.rect(Math.cos(an) * 112 - 14, Math.sin(an) * 112 - 4, 28, 8, 4), '#ffd23f', .9); }
    flat(P.circ(0, 0, 92), '#ffb01f'); ctx.restore();
    cut(P.circ(0, 0, 72), '#0a0614', { lw: 6, d: .8 });
    for (const ex of [-26, 26]) { inked(P.ell(ex, -18, 13, 15), '#ffffff', 3); flat(P.circ(ex + 6, -14, 6), INK); line([[ex - 16, -40 + (ex < 0 ? -6 : 6)], [ex + 14, -40 + (ex < 0 ? 6 : -6)]], '#ff9a1f', 4); }
    const M = P.ell(0, 30, 34, 6 + bite * 18); inked(M, '#2a0a20', 3.5);
    for (let i = 0; i < 6; i++) { const tx = -26 + i * 10.5; flat(P.poly([[tx, 30 - 6 - bite * 18 + 2], [tx + 8, 30 - 6 - bite * 18 + 2], [tx + 4, 30 - bite * 10]]), '#ffffff'); }
    ctx.restore();
    // a star being spaghettified on the way in
    const u = reduce ? .5 : (t * .12) % 1;
    line([[bx + 260 - u * 160, 110 + u * 120], [bx + 80 + (1 - u) * 60, by - 40]], INK, 12 * (1 - u * .5)); line([[bx + 260 - u * 160, 110 + u * 120], [bx + 80 + (1 - u) * 60, by - 40]], '#fff3b0', 6 * (1 - u * .5));
    sign(820, 92, 170, 50, 'NO DIVING', 24, t, '#ff5f5f', PAPER, 1);
    saucer(770, 540, .34, t);
  },
  front(t) { asteroid(60, 556, 30, reduce ? 0 : t * .2); asteroid(118, 590, 16, reduce ? 1 : -t * .3); },
};

import { P, cut, inked, flat, box, line, vgrad, hang, label, ctx, reduce, W, H, INK, EDGE, PAPER, FONT, clamp, lerp, easeOut, rng, mix } from '../draw.js';
import { STARS, space, porthole, flask, lamp, cloud, building, planet, asteroid } from './props.js';
import { faceStar, galaxy, blobGalaxy, sign, haze, stream, star5, bunting, wob } from './props2.js';
import { sciHead, scientist, bobY, pilot, heli, rocket, saucer } from '../sprites/scientist.js';
import { toaster, goopScientist, tinyHuman, tableRide } from '../sprites/act2.js';
import { goopColours } from '../sprites/goop.js';

const gone = (a, id) => !!(a.gone && a.gone.has(id));

export default { // 9: Milky Way mukbang (the whole galaxy, arm by arm, live)
  goop: { x: 600, base: 320, grounded: false, r0: 112, r1: 220 }, hand: [196, 470],
  back(t, p, a) {
    space(t, '#101848', '#2a1a62', [[600, 300, 420, 'rgba(59,108,255,.2)']]);
    ctx.save(); ctx.translate(600, 300); ctx.rotate(reduce ? 0 : t * .03); ctx.scale(1, .55);                   // the galaxy on the plate, turning
    for (let arm = 0; arm < 2; arm++) for (let i = 0; i < 40; i++) {
      const u = i / 40, an = arm * Math.PI + u * 6, rr = 60 + u * 420;
      if (an % (Math.PI * 2) > 5.4 - p * 3) continue;                                     // the eaten bit grows
      flat(P.circ(Math.cos(an) * rr, Math.sin(an) * rr, 10 * (1 - u * .5)), u > .7 ? '#a6c0ff' : '#fff3d6', .5);
    }
    if (!gone(a, 'bar')) flat(P.rect(-110, -18, 220, 36, 18), '#fff3b0', .45);
    ctx.restore();
  },
  mid(t, p, a) {
    const live = reduce || Math.floor(t * 1.5) % 2 === 0;                                // LIVE light, blinking
    sign(130, 82, 150, 56, 'LIVE', 30, t, live ? '#ff5f5f' : '#b83a3a', PAPER);
    for (let i = 0; i < 5; i++) {                                                        // chat hearts floating up
      const u = reduce ? i / 5 : (t * .18 + i / 5) % 1, hx = 860 + Math.sin(u * 9 + i) * 26, hy = 560 - u * 420;
      ctx.globalAlpha = Math.sin(u * Math.PI);
      const Hh = new Path2D(); Hh.moveTo(hx, hy + 8); Hh.bezierCurveTo(hx - 18, hy - 6, hx - 8, hy - 18, hx, hy - 8); Hh.bezierCurveTo(hx + 8, hy - 18, hx + 18, hy - 6, hx, hy + 8); cut(Hh, '#ff5f8f', { lw: 3, d: .4 });
      ctx.globalAlpha = 1;
    }
    // ring light on a stand, pointed at the goop
    line([[318, 600], [318, 300]], INK, 9); line([[318, 600], [318, 300]], '#8f9bb8', 4);
    inked(P.circ(318, 262, 52), '#fff3b0', 6); flat(P.circ(318, 262, 34), '#101848'); ctx.lineWidth = 4; ctx.strokeStyle = INK; ctx.stroke(P.circ(318, 262, 34));
    flat(P.poly([[350, 240], [370, 290], [600, 420], [560, 160]]), 'rgba(255,243,176,.08)');
    // chopsticks, holding a star
    ctx.save(); ctx.translate(840, 220); ctx.rotate(.5 + wob(t, 1.4, 0) * .06);
    for (const dy of [-8, 8]) { line([[-150, dy * .4], [80, dy]], INK, 9); line([[-150, dy * .4], [80, dy]], '#f2a154', 4); }
    star5(-150, 0, 18, '#ffd23f', reduce ? 0 : t, 3);
    ctx.restore();
    rocket(196, 500, .36, t);
  },
  front(t) {
    cut(P.rect(-20, 548, 160, 70, 8), '#3b2a63', { lw: 4, d: 1.6 });                  // the camera
    inked(P.circ(110, 548, 30), '#22c3b0', 4); flat(P.circ(110, 548, 16), INK);
    flat(P.circ(116, 542, 5), '#ffffff', .8);
  },
};

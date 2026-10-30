import { P, cut, inked, flat, box, line, vgrad, hang, label, ctx, reduce, W, H, INK, EDGE, PAPER, FONT, clamp, lerp, easeOut, rng, mix } from '../draw.js';
import { STARS, space, porthole, flask, lamp, cloud, building, planet, asteroid } from './props.js';
import { faceStar, galaxy, blobGalaxy, sign, haze, stream, star5, bunting, wob } from './props2.js';
import { sciHead, scientist, bobY, pilot, heli, rocket, saucer } from '../sprites/scientist.js';
import { toaster, goopScientist, tinyHuman, tableRide } from '../sprites/act2.js';
import { goopColours } from '../sprites/goop.js';


// The original scientist floats past on the stage 1 lab table, waving, about every forty seconds.
export function rideAt(t) { const u = reduce ? .25 : (t / 40) % 1; return [lerp(1180, -220, u), 470 + Math.sin(u * Math.PI * 2) * 30]; }

export default { // 17: beyond the horizon (everything we cannot see, which was rude)
  goop: { x: 600, base: 290, grounded: false, r0: 104, r1: 200 }, hand: [170, 230],
  back(t) {
    space(t, '#0c1a2a', '#162a3a', [[600, 640, 520, 'rgba(31,159,152,.28)']]);
    const glow = reduce ? .5 : (Math.sin(t * 1.2) + 1) / 2;                          // the horizon, glowing
    const Hz = new Path2D(); Hz.moveTo(-60, 470); Hz.quadraticCurveTo(480, 380, 1020, 470); Hz.lineTo(1020, 700); Hz.lineTo(-60, 700); Hz.closePath();
    flat(Hz, '#071016');
    ctx.beginPath(); ctx.moveTo(-60, 470); ctx.quadraticCurveTo(480, 380, 1020, 470); ctx.strokeStyle = 'rgba(143,232,222,' + (.4 + glow * .4) + ')'; ctx.lineWidth = 6; ctx.stroke();
  },
  mid(t, p, a) {
    ctx.setLineDash([9, 9]);                                                          // things nobody can see, outlined in guesswork
    [[120, 120, 40], [860, 150, 50], [800, 560, 34], [160, 560, 30]].forEach(([x, y, r], i) => {
      const by = reduce ? 0 : Math.sin(t * 1.6 + i * 1.7) * 8;
      ctx.beginPath(); ctx.arc(x, y + by, r, 0, 7); ctx.strokeStyle = 'rgba(143,232,222,.7)'; ctx.lineWidth = 3; ctx.stroke();
      label('?', x, y + by + 2, r * 1.1, 'rgba(143,232,222,.85)');
    });
    ctx.setLineDash([]);
    rocket(170, 262, .34, t);
  },
  front(t) {
    const [rx, ry] = rideAt(t);
    tableRide(rx, ry, .62, t, scientist);
  },
};

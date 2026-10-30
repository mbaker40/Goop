import { P, cut, inked, flat, box, line, vgrad, hang, label, ctx, reduce, W, H, INK, EDGE, PAPER, FONT, clamp, lerp, easeOut, rng, mix } from '../draw.js';
import { STARS, space, porthole, flask, lamp, cloud, building, planet, asteroid } from './props.js';
import { faceStar, galaxy, blobGalaxy, sign, haze, stream, star5, bunting, wob } from './props2.js';
import { sciHead, scientist, bobY, pilot, heli, rocket, saucer } from '../sprites/scientist.js';
import { toaster, goopScientist, tinyHuman, tableRide } from '../sprites/act2.js';
import { goopColours } from '../sprites/goop.js';

const gone = (a, id) => !!(a.gone && a.gone.has(id));

export default { // 18: the dark side of the menu (dark matter, then dark energy for dessert)
  goop: { x: 620, base: 300, grounded: false, r0: 104, r1: 204 }, hand: [770, 528],
  back(t) {
    space(t, '#120a1e', '#24102e', [[620, 300, 400, 'rgba(196,127,200,.14)']]);
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(820, 470, 40 + i * 26 + (reduce ? 0 : (t * 8) % 26), 0, 7); ctx.strokeStyle = 'rgba(196,127,200,' + (.3 - i * .08) + ')'; ctx.lineWidth = 3; ctx.stroke(); }   // lensing rings, around something invisible
  },
  mid(t, p, a) {
    // the menu, swaying
    hang(140, 30); hang(260, 30);
    ctx.save(); ctx.translate(200, 200); ctx.rotate(wob(t, .9, 0) * .04);
    cut(P.rect(-110, -150, 220, 300, 8), '#2a1838', { lw: 4, d: 1.2 }); flat(P.rect(-98, -138, 196, 276, 4), '#3b2a63');
    label('MENU', 0, -112, 30, '#ffd23f');
    [['Dark matter', '???'], ['(you cannot see it)', ''], ['Dark energy', '???'], ['(dessert)', ''], ['Light', 'sold out']].forEach(([l, r], i) => {
      ctx.font = '400 ' + (r || i === 4 ? 18 : 14) + 'px ' + FONT; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = PAPER; ctx.fillText(l, -86, -62 + i * 36);
      if (r) { ctx.textAlign = 'right'; ctx.fillText(r, 86, -62 + i * 36); }
    });
    ctx.restore();
    // a candle, flickering
    cut(P.rect(372, 470, 22, 60, 4), '#fff3d6', { lw: 3.5, d: .8 });
    const fl = reduce ? 1 : 1 + .2 * Math.sin(t * 17) + .1 * Math.sin(t * 29);
    inked(P.ell(383, 456, 9 * fl, 16 * fl), '#ffb01f', 3); flat(P.ell(383, 460, 4, 8), '#fff3b0');
    // the Dark Matter Whisk, spinning
    hang(470, 40); ctx.save(); ctx.translate(470, 150);
    line([[0, -110], [0, -20]], INK, 12); line([[0, -110], [0, -20]], '#c47fc8', 6);
    const sp = reduce ? 0 : t * 6;
    for (let i = 0; i < 4; i++) { const w = Math.cos(sp + i * Math.PI / 4) * 28; ctx.beginPath(); ctx.ellipse(0, 20, Math.abs(w) + 2, 44, 0, 0, 7); ctx.strokeStyle = INK; ctx.lineWidth = 6; ctx.stroke(); ctx.strokeStyle = '#c9cfdf'; ctx.lineWidth = 2.5; ctx.stroke(); }
    ctx.restore();
    if (!gone(a, 'bill')) { inked(P.ell(880, 560, 50, 12), '#c9cfdf', 3); ctx.save(); ctx.translate(880, 548); ctx.rotate(-.1); cut(P.rect(-30, -20, 60, 30, 3), PAPER, { lw: 3, d: .5 }); label('BILL', 0, -5, 16, INK); ctx.restore(); }
    saucer(770, 556, .32, t);
  },
  front(t) { asteroid(60, 590, 22, reduce ? 0 : t * .1); },
};

import { P, cut, inked, flat, box, line, vgrad, hang, label, ctx, reduce, W, H, INK, EDGE, PAPER, FONT, clamp, lerp, easeOut, rng, mix } from '../draw.js';
import { STARS, space, porthole, flask, lamp, cloud, building, planet, asteroid } from './props.js';
import { faceStar, galaxy, blobGalaxy, sign, haze, stream, star5, bunting, wob } from './props2.js';
import { sciHead, scientist, bobY, pilot, heli, rocket, saucer } from '../sprites/scientist.js';
import { toaster, goopScientist, tinyHuman, tableRide } from '../sprites/act2.js';
import { goopColours } from '../sprites/goop.js';

const gone = (a, id) => !!(a.gone && a.gone.has(id));
const NODES = (() => { const r = rng(15); return Array.from({ length: 16 }, () => [r() * 1000 - 20, r() * 640 - 20]); })();

export default { // 14: the cosmic web (filaments slurped like noodles)
  goop: { x: 620, base: 312, grounded: false, r0: 108, r1: 210 }, hand: [770, 520],
  back(t) {
    space(t, '#1a1640', '#2e2a50', [[300, 300, 360, 'rgba(215,240,60,.14)']]);
    for (let i = 0; i < NODES.length; i++) for (let j = i + 1; j < NODES.length; j++) {
      const [ax, ay] = NODES[i], [bx, by] = NODES[j];
      if (Math.hypot(ax - bx, ay - by) < 260) { line([[ax, ay], [bx, by]], 'rgba(243,255,176,.28)', 5); }
    }
    for (const [i, [nx, ny]] of NODES.entries()) flat(P.circ(nx, ny, 7 + (reduce ? 0 : 3 * Math.sin(t * 2 + i))), '#f3ffb0', .6);   // nodes, pulsing
  },
  mid(t, p, a) {
    // the Filament Fork, twirling a noodle of galaxies
    const spin = reduce ? 0 : t * 1.4;
    hang(200, 40); ctx.save(); ctx.translate(200, 230); ctx.rotate(.2);
    line([[0, -190], [0, 40]], INK, 14); line([[0, -190], [0, 40]], '#c9cfdf', 7);
    cut(P.rect(-34, 30, 68, 20, 6), '#c9cfdf', { lw: 4, d: .8 });
    for (const tx of [-28, -10, 10, 28]) { line([[tx, 46], [tx, 110]], INK, 8); line([[tx, 46], [tx, 110]], '#c9cfdf', 3.5); }
    for (let i = 0; i < 4; i++) { const yy = 70 + i * 12; ctx.beginPath(); ctx.ellipse(0, yy, 52, 10, Math.sin(spin + i) * .2, 0, 7); ctx.strokeStyle = INK; ctx.lineWidth = 9; ctx.stroke(); ctx.strokeStyle = '#f3ffb0'; ctx.lineWidth = 4.5; ctx.stroke(); }
    ctx.restore();
    // a noodle, being slurped
    const mx = 620 - a.r * .7, my = a.cy + a.r * .25;
    ctx.beginPath(); ctx.moveTo(250, 340);
    for (let i = 1; i <= 12; i++) { const u = i / 12; ctx.lineTo(lerp(250, mx, u), lerp(340, my, u) + Math.sin(u * 14 - (reduce ? 0 : t * 6)) * 16 * (1 - u)); }
    ctx.strokeStyle = INK; ctx.lineWidth = 12; ctx.lineCap = 'round'; ctx.stroke(); ctx.strokeStyle = '#f3ffb0'; ctx.lineWidth = 6; ctx.stroke();
    if (!gone(a, 'wall')) {                                                            // a slice of the Sloan Great Wall
      for (let r = 0; r < 3; r++) for (let c = 0; c < 4 - (r % 2); c++) cut(P.rect(820 + c * 34 + (r % 2) * 17, 200 + r * 20, 32, 18, 2), '#c9793a', { lw: 3, d: .4 });
      label('GREAT WALL', 886, 184, 16, 'rgba(255,243,214,.85)');
    }
    saucer(770, 548, .34, t);
  },
  front(t) { asteroid(900, 580, 24, reduce ? 0 : t * .2); },
};

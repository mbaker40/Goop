import { P, cut, inked, flat, line, ctx, INK, EDGE, label } from '../draw.js';
import { star5 } from '../scenes/props2.js';

/* ---------- Act 2 snacks: two per stage, each drawn around (0,0) about 40 units wide ---------- */
const sun = (c, rc) => () => { for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; line([[Math.cos(a) * 14, Math.sin(a) * 14], [Math.cos(a) * 22, Math.sin(a) * 22]], INK, 5); line([[Math.cos(a) * 14, Math.sin(a) * 14], [Math.cos(a) * 21, Math.sin(a) * 21]], rc, 2.5); } cut(P.circ(0, 0, 14), c, { lw: 3.5, d: .5 }); };
const star = c => () => star5(0, 0, 21, c, 0, 3.5);
const babyStar = () => { star5(0, -2, 20, '#fff3b0', 0, 3.5); inked(P.circ(0, 5, 5), '#ff8fc0', 2.5); };
const puff = c => () => { for (const [x, y, r] of [[-10, 4, 12], [8, 6, 11], [0, -6, 13]]) cut(P.circ(x, y, r), c, { lw: 3, d: .4 }); };
const noodleStar = () => { line([[-24, 8], [-8, -4], [8, 6], [24, -6]], INK, 11); line([[-24, 8], [-8, -4], [8, 6], [24, -6]], '#ffd23f', 6); };
const ring = () => { inked(P.ell(0, 0, 24, 8, -.3), '#ff9a1f', 3); cut(P.circ(0, 0, 13), '#231838', { lw: 3.5, d: .5 }); };
const spiral = (d, a) => () => { inked(P.ell(0, 0, 22, 12, -.3), d, 3); for (let i = 0; i < 8; i++) { const u = i / 8, an = u * 5; flat(P.circ(Math.cos(an) * 16 * u, Math.sin(an) * 8 * u, 2.5), a); } flat(P.circ(0, 0, 4), '#fff3b0'); };
const parcel = () => { cut(P.rect(-20, -14, 40, 28, 3), '#d9b98a', { lw: 3.5, d: .5 }); line([[-20, 0], [20, 0]], '#b98852', 3); line([[0, -14], [0, 14]], '#b98852', 3); };
const dwarf = () => { inked(P.ell(0, 6, 22, 7), '#ffffff', 3); for (const [x, y] of [[-6, -2], [4, -6], [6, 2], [-2, 4], [0, -10]]) flat(P.circ(x, y, 3), '#fff3d6'); flat(P.circ(0, -2, 6), '#ffd23f', .7); };
const dish = () => { cut(P.rect(-22, -6, 44, 18, 6), '#ff7a59', { lw: 3.5, d: .5 }); inked(P.ell(0, -6, 20, 6), '#ffd48f', 2.5); };
const cluster = () => { for (const [x, y, r] of [[-9, 4, 9], [9, 5, 8], [0, -8, 9]]) cut(P.circ(x, y, r), '#c4ffe4', { lw: 3, d: .3 }); };
const cube = () => { cut(P.poly([[-14, -6], [4, -14], [20, -6], [2, 2]]), '#a6f4e9', { lw: 3, d: .3 }); cut(P.poly([[-14, -6], [2, 2], [2, 20], [-14, 12]]), '#5fe8a8', { lw: 3, d: .3 }); cut(P.poly([[2, 2], [20, -6], [20, 12], [2, 20]]), '#2fbf82', { lw: 3, d: .3 }); };
const arrowGal = () => { spiral('#49c6f5', '#ffffff')(); line([[14, -10], [24, -18]], INK, 4); };
const noodle = () => { line([[-24, 0], [-14, -10], [-4, 4], [6, -10], [16, 4], [24, -6]], INK, 9); line([[-24, 0], [-14, -10], [-4, 4], [6, -10], [16, 4], [24, -6]], '#f3ffb0', 4.5); };
const node = () => { for (const a of [0, 2.1, 4.2]) line([[0, 0], [Math.cos(a) * 22, Math.sin(a) * 22]], '#d7f03c', 4); cut(P.circ(0, 0, 9), '#ffffff', { lw: 3, d: .3 }); };
const nothing = () => { ctx.setLineDash([5, 6]); ctx.beginPath(); ctx.arc(0, 0, 18, 0, 7); ctx.strokeStyle = '#f4f1ff'; ctx.lineWidth = 3; ctx.stroke(); ctx.setLineDash([]); };
const voidBox = () => { ctx.setLineDash([5, 5]); ctx.strokeStyle = '#f4f1ff'; ctx.lineWidth = 3; ctx.strokeRect(-16, -16, 32, 32); ctx.setLineDash([]); label('?', 0, 2, 20, '#f4f1ff'); };
const cmb = () => { cut(P.ell(0, 0, 24, 13), '#ffb36b', { lw: 3.5, d: .5 }); for (const [x, y, c] of [[-10, -3, '#56b4ff'], [6, 4, '#56b4ff'], [12, -5, '#ff5f5f'], [-2, 6, '#ff5f5f']]) flat(P.circ(x, y, 4), c); };
const ask = () => { cut(P.circ(0, 0, 18), '#8fe8de', { lw: 3.5, d: .5 }); label('?', 0, 2, 26, INK); };
const darkBlob = () => { cut(P.circ(0, 0, 17), '#46164c', { lw: 3.5, d: .5 }); ctx.setLineDash([4, 5]); ctx.beginPath(); ctx.arc(0, 0, 23, 0, 7); ctx.strokeStyle = '#c47fc8'; ctx.lineWidth = 2.5; ctx.stroke(); ctx.setLineDash([]); };
const cupcake = () => { cut(P.poly([[-14, 0], [14, 0], [10, 18], [-10, 18]]), '#c47fc8', { lw: 3.5, d: .5 }); cut(P.ell(0, -4, 17, 12), '#2a1838', { lw: 3.5, d: .5 }); flat(P.circ(0, -16, 4), '#ff5f8f'); };
const digit = () => { inked(P.rect(-16, -20, 32, 40, 6), '#fff3d6', 3); label('7', 0, 2, 30, INK); };
const button = () => { cut(P.rect(-24, -12, 48, 24, 7), '#8fdc2f', { lw: 3.5, d: .5 }); label('BUY', 0, 1, 14, INK); };

export const FOOD2 = [
  [star('#fff3b0'), sun('#ff5f5f', '#ffb01f')], [babyStar, puff('#ff9ad8')], [noodleStar, ring], [spiral('#3b6cff', '#fff3b0'), star('#ffd23f')],
  [spiral('#e23fd1', '#ffd6f0'), parcel], [dwarf, dish], [cluster, cube], [arrowGal, cluster], [noodle, node], [nothing, voidBox],
  [cmb, spiral('#ff7a59', '#ffffff')], [ask, spiral('#1f9f98', '#8fe8de')], [darkBlob, cupcake], [digit, button],
];
export { EDGE };

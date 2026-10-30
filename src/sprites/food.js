import { P, cut, inked, flat, box, line, vgrad, hang, label, ctx, reduce, W, H, INK, EDGE, PAPER, FONT, clamp, lerp, easeOut, rng, mix } from '../draw.js';

/* ---------- snacks: two per stage, each drawn around (0,0) about 40 units wide ---------- */
export const FOOD = [
  [() => { cut(P.circ(0, 0, 18), '#ff8fc0', { lw: 3.5, d: .5 }); inked(P.circ(0, 0, 6), EDGE, 3); },
   () => { cut(P.poly([[-20, 14], [20, 14], [14, -14]]), '#ffd23f', { lw: 3.5, d: .5 }); flat(P.circ(4, 6, 3.5), '#d99a00'); flat(P.circ(11, -2, 2.5), '#d99a00'); }],
  [() => { cut(P.rect(-14, -19, 28, 38, 6), '#22c3b0', { lw: 3.5, d: .5 }); box(-14, -5, 28, 10, '#ffd23f'); line([[-14, -5], [14, -5]], INK, 2.5); line([[-14, 5], [14, 5]], INK, 2.5); },
   () => { line([[0, 10], [0, 20]], INK, 6); line([[-10, 20], [10, 20]], INK, 6); cut(P.rect(-21, -17, 42, 29, 4), '#c9cfdf', { lw: 3.5, d: .5 }); flat(P.rect(-15, -11, 30, 17, 2), '#2b2150'); line([[-9, 0], [-3, -5], [3, 1], [9, -6]], '#8fdc2f', 2.5); }],
  [() => { cut(P.poly([[-24, 8], [-24, -3], [-12, -4], [-6, -15], [10, -15], [16, -4], [24, -2], [24, 8]]), '#ff5f5f', { lw: 3.5, d: .5 }); flat(P.rect(-4, -11, 11, 7, 1), '#c9f3ff'); inked(P.circ(-13, 9, 6), INK, 2); inked(P.circ(13, 9, 6), INK, 2); },
   () => { cut(P.rect(-26, -14, 52, 24, 5), '#ffd23f', { lw: 3.5, d: .5 }); for (const wx of [-20, -8, 4, 16]) flat(P.rect(wx, -9, 8, 8, 1), '#c9f3ff'); inked(P.circ(-15, 11, 6), INK, 2); inked(P.circ(15, 11, 6), INK, 2); }],
  [() => { cut(P.poly([[-26, 16], [0, -20], [26, 16]]), '#9a8fb5', { lw: 3.5, d: .5 }); inked(P.poly([[-10, -6], [0, -20], [10, -6], [4, -1], [0, -7], [-5, -1]]), '#ffffff', 2.5); },
   () => { cut(P.poly([[-22, 14], [-14, -8], [-2, -18], [8, -4], [20, -10], [24, 14]]), '#c9f3ff', { lw: 3.5, d: .5 }); line([[-8, 4], [0, -6], [6, 6]], '#8fd0e8', 3); }],
  [() => { cut(P.circ(0, 0, 19), '#d9dbe8', { lw: 3.5, d: .5 }); flat(P.circ(-6, -5, 5), '#b3b7cc'); flat(P.circ(7, 4, 4), '#b3b7cc'); flat(P.circ(3, -10, 2.5), '#b3b7cc'); },
   () => { cut(P.poly([[-20, -4], [-8, -17], [10, -14], [21, -2], [14, 14], [-6, 17], [-19, 9]]), '#b98852', { lw: 3.5, d: .5 }); flat(P.circ(-4, -2, 4), '#8f6638'); flat(P.circ(8, 5, 3), '#8f6638'); }],
  [() => { inked(P.ell(0, 0, 30, 8, -.3), '#f2d38a', 3); cut(P.circ(0, 0, 16), '#e8a25a', { lw: 3.5, d: .5 }); line([[-12, 8], [14, -1]], '#c9793a', 3); },
   () => { cut(P.poly([[-8, -8], [-36, -20], [-30, -6], [-40, 4], [-8, 8]]), '#c9f3ff', { lw: 3.5, d: .5 }); cut(P.circ(0, 0, 13), '#6be6d6', { lw: 3.5, d: .5 }); }],
];

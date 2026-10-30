/* The ending, drawn in the canvas: six beats from cutscene.js. Reuses the game's own pieces: the goop
   sprite, the splash drops (here fifty times over, as sparks that cool into stars), the camera zoom,
   the stage 1 diorama with the roles swapped, and the float-number style for "+1 grub". */
import { P, cut, inked, flat, box, line, label, ctx, reduce, W, H, INK, PAPER, FONT, clamp, lerp, easeOut, rng, mix } from './draw.js';
import { frameAt, zoomAt, EVOLUTION, EVO_FROM, EVO_EACH } from './cutscene.js';
import { drawGoop, EYES } from './sprites/goop.js';
import { goopScientist, tinyHuman, toaster } from './sprites/act2.js';
import { galaxy, faceStar, star5 } from './scenes/props2.js';
import { space } from './scenes/props.js';
import { SCENES } from './scenes/index.js';

const NIGHT = '#0b0716', K = 19;                 // the goop as it was at the very end: The Fourth Wall's colours
const GX = W / 2, GY = H / 2, GR = 240;          // centred, filling 80% of the frame
const smooth = u => { u = clamp(u, 0, 1); return u * u * (3 - 2 * u); };

// 800 sparks: the splash drops at 50x (a feed splashes 16), each with its own direction and galaxy.
const GAL = [[-120, -60], [110, -90], [-40, 90], [150, 70], [-170, 60], [20, -150]];
const SPARKS = (() => { const r = rng(2026); return Array.from({ length: 800 }, (_, i) => ({ a: r() * Math.PI * 2, v: 160 + r() * 520, d: r() * 1.2, s: 2 + r() * 4, g: i % GAL.length, ga: r() * Math.PI * 2, gr: Math.sqrt(r()) * 70 })); })();
const HOT = ['#fff3b0', '#ffd23f', '#ffb01f', '#ff5f8f', '#a6c0ff', '#fff3d6'];

function black(a) { if (a > 0) { ctx.globalAlpha = clamp(a, 0, 1); ctx.fillStyle = NIGHT; ctx.fillRect(-60, -60, W + 120, H + 120); ctx.globalAlpha = 1; } }
function card(text, alpha, onBlack) {
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha = alpha;
  if (onBlack) { ctx.fillStyle = NIGHT; ctx.fillRect(-60, -60, W + 120, H + 120); }
  const size = text.length > 30 ? 46 : 58;
  ctx.font = '400 ' + size + 'px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  const y = onBlack ? H / 2 : H - 92;
  if (!onBlack) { const w = Math.min(W - 40, ctx.measureText(text).width + 60); cut(P.rect(GX - w / 2, y - 44, w, 88, 12), PAPER, { lw: 4, d: 1 }); ctx.fillStyle = INK; ctx.fillText(text, GX, y + 2); }
  else { ctx.lineWidth = 8; ctx.strokeStyle = INK; ctx.strokeText(text, GX, y); ctx.fillStyle = PAPER; ctx.fillText(text, GX, y); }
  ctx.restore();
}
function floatText(txt, x, y, life) {               // the "+12" style
  ctx.save(); ctx.globalAlpha = clamp(life * 2.2, 0, 1); ctx.font = '400 30px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  ctx.lineWidth = 6; ctx.strokeStyle = INK; ctx.strokeText(txt, x, y); ctx.fillStyle = PAPER; ctx.fillText(txt, x, y); ctx.restore();
}
function spiralEye(x, y, r, t, ph) {
  ctx.save(); ctx.translate(x, y); ctx.rotate((reduce ? 0 : t * .8) + ph);
  inked(P.circ(0, 0, r), '#1b1654', 3);
  for (let a = 0; a < 2; a++) for (let i = 0; i < 14; i++) { const u = i / 14, an = a * Math.PI + u * 5; flat(P.circ(Math.cos(an) * r * u * .9, Math.sin(an) * r * u * .9, Math.max(1.5, r * .1 * (1 - u * .6))), '#fff3d6', 1 - u * .4); }
  flat(P.circ(0, 0, r * .22), '#fff3b0'); ctx.restore();
}

/* ---------- beat 1: the last bite ---------- */
function bite(f, t) {
  black(1);
  const chew = f.local < 3 ? Math.abs(Math.sin(f.local / 3 * Math.PI * 2)) : 0;     // the mouth loops twice, then three seconds of nothing
  const burp = f.local > 4.6 ? clamp((f.local - 4.6) / .25, 0, 1) * clamp((5.4 - f.local) / .3, 0, 1) : 0;
  drawGoop({ x: GX, base: GY, grounded: false }, GR, K, .9, t, { squash: burp * .25 - chew * .05, mouth: Math.max(chew * .6, burp * .5), lookX: GX, lookY: GY, mood: 'closed' });
  if (f.local > 4.6 && f.local < 5.8) {
    const u = (f.local - 4.6) / 1.2;
    inked(P.circ(GX + 40, GY + 40 - u * 60, 10 + u * 8), 'rgba(255,243,214,.8)', 3);
    label('burp', GX + 120, GY - 10 - u * 30, 26, PAPER);
  }
}
/* ---------- beat 2: the Goop Bang ---------- */
function bang(f, t, reduced) {
  black(1);
  const L = f.local, pull = lerp(1, .5, smooth((L - 2) / 9));                         // the camera pulls back
  ctx.save(); ctx.translate(GX, GY); ctx.scale(pull, pull); ctx.translate(-GX, -GY);
  const belly = smooth((L - 6) / 4);                                                   // the belly turns see-through
  drawGoop({ x: GX, base: GY, grounded: false }, GR, K, .9, t, { squash: 0, mouth: clamp(1 - L / 1.5, 0, 1), lookX: GX, lookY: GY, mood: belly > .3 ? 'blank' : 'closed' });
  if (belly > 0) { ctx.save(); ctx.globalAlpha = .65 * belly; flat(P.circ(GX, GY, GR * .98), '#1b1654'); ctx.restore(); }
  if (belly > .3) { ctx.globalAlpha = clamp((belly - .3) / .5, 0, 1); spiralEye(GX + EYES[0][0] * GR - 70, GY + EYES[0][1] * GR, GR * .2, t, 0); spiralEye(GX + 70, GY + EYES[0][1] * GR, GR * .2, t, 2); ctx.globalAlpha = 1; }
  const mx = GX + GR * .05, my = GY + GR * .3;
  for (const s of SPARKS) {
    const tau = L - s.d; if (tau <= 0) continue;
    const fly = 1 - Math.exp(-tau / 2.4), out = s.v * fly * 1.6;
    let x = mx + Math.cos(s.a) * out, y = my + Math.sin(s.a) * out;
    const m = smooth((tau - 5) / 6);                                                    // then they pull into galaxies, inside the goop
    if (m > 0) {
      const [cx, cy] = GAL[s.g], an = s.ga + (reduced ? 0 : tau * .6), gx = GX + cx + Math.cos(an) * s.gr, gy = GY + cy + Math.sin(an) * s.gr * .55;
      x = lerp(x, gx, m); y = lerp(y, gy, m);
    }
    const heat = clamp(tau / 5, 0, 1), col = HOT[Math.min(HOT.length - 1, Math.floor(heat * (HOT.length - 1) + (s.g % 2) * .5))];
    const r = s.s * (1 - .4 * m);
    if (r > 3.4) inked(P.circ(x, y, r), col, 2); else flat(P.circ(x, y, r), col);
  }
  ctx.restore();
}
/* ---------- beat 3: zoom in, then evolution ---------- */
const CREATURES = {
  fish(x, y, t) { cut(P.poly([[x + 40, y], [x + 70, y - 22], [x + 70, y + 22]]), '#8fdc2f', { lw: 4, d: .8 }); cut(P.ell(x, y, 50, 30), '#8fdc2f', { lw: 4, d: .8 }); inked(P.circ(x - 22, y - 6, 14), '#ffffff', 3); flat(P.circ(x - 26, y - 6, 7), INK); },
  lizard(x, y) { line([[x + 40, y], [x + 90, y + 10]], INK, 14); line([[x + 40, y], [x + 90, y + 10]], '#62ae1c', 8); for (const lx of [-24, 20]) line([[x + lx, y + 10], [x + lx - 8, y + 34]], INK, 8); cut(P.ell(x, y, 54, 20), '#8fdc2f', { lw: 4, d: .8 }); inked(P.circ(x - 34, y - 8, 9), '#ffffff', 3); flat(P.circ(x - 36, y - 8, 4.5), INK); },
  legs(x, y, t) { for (let i = 0; i < 8; i++) { const lx = x - 42 + i * 12; line([[lx, y + 6], [lx + Math.sin(t * 9 + i) * 6, y + 38]], INK, 6); } cut(P.ell(x, y, 54, 24), '#ffb01f', { lw: 4, d: .8 }); for (const ex of [-30, -14]) { inked(P.circ(x + ex, y - 10, 8), '#ffffff', 3); flat(P.circ(x + ex, y - 10, 4), INK); } },
  frog(x, y) { cut(P.ell(x, y + 6, 46, 30), '#22c3b0', { lw: 4, d: .8 }); for (const ex of [-18, 18]) { cut(P.circ(x + ex, y - 22, 13), '#22c3b0', { lw: 4, d: .5 }); flat(P.circ(x + ex, y - 22, 6), INK); } line([[x - 20, y + 12], [x + 20, y + 12]], INK, 4); cut(P.ell(x, y - 46, 26, 6), '#3b2a63', { lw: 3, d: .3 }); cut(P.rect(x - 14, y - 66, 28, 22, 4), '#3b2a63', { lw: 3, d: .3 }); },
  monkey(x, y, t, extra) {
    line([[x + 30, y + 30], [x + 60, y + 10 + Math.sin(t * 3) * 6]], INK, 9); line([[x + 30, y + 30], [x + 60, y + 10 + Math.sin(t * 3) * 6]], '#a8743a', 4);
    cut(P.ell(x, y + 30, 32, 38), '#a8743a', { lw: 4, d: .8 });
    for (const ex of [-30, 30]) cut(P.circ(x + ex, y - 22, 12), '#a8743a', { lw: 3.5, d: .4 });
    cut(P.circ(x, y - 20, 30), '#a8743a', { lw: 4, d: .6 }); flat(P.ell(x, y - 12, 20, 16), '#f4c9a0');
    if (extra === 'goggles') { inked(P.rect(x - 32, y - 34, 64, 9, 3), '#3b2a63', 2.5); for (const ex of [-11, 11]) { inked(P.circ(x + ex, y - 26, 10), '#8f9bb8', 3); inked(P.circ(x + ex, y - 26, 6), '#dffcf6', 2); flat(P.circ(x + ex + 2, y - 25, 3), INK); } }
    else for (const ex of [-10, 10]) flat(P.circ(x + ex, y - 24, 4), INK);
    if (extra === 'clipboard' || extra === 'goggles') { ctx.save(); ctx.translate(x - 34, y + 30); ctx.rotate(-.2); cut(P.rect(-16, -20, 32, 42, 3), '#b98852', { lw: 3, d: .5 }); inked(P.rect(-12, -14, 24, 30, 2), PAPER, 2); for (const ly of [-6, 0, 6]) line([[-7, ly], [7, ly]], INK, 1.5); ctx.restore(); }
  },
};
function evolutionStill(i, x, y, t) {
  const id = EVOLUTION[i];
  ctx.save(); ctx.translate(x, y);
  cut(P.rect(-140, -120, 280, 240, 10), PAPER, { lw: 5, d: 1.2 });
  flat(P.rect(-128, -108, 256, 216), '#5fd0f0'); flat(P.rect(-128, 30, 256, 78), '#8fdc2f'); line([[-128, 30], [128, 30]], INK, 3);   // slop-green sea, sky
  ctx.lineWidth = 5; ctx.strokeStyle = INK; ctx.strokeRect(-128, -108, 256, 216);
  label((i + 1) + '/8', 100, -88, 18, INK);
  ctx.restore();
  ctx.save(); ctx.beginPath(); ctx.rect(x - 128, y - 108, 256, 216); ctx.clip();
  if (id === 'fish') CREATURES.fish(x, y + 34, t);
  else if (id === 'lizard') CREATURES.lizard(x, y + 14, t);
  else if (id === 'legs') CREATURES.legs(x, y + 6, t);
  else if (id === 'frog') CREATURES.frog(x, y + 20, t);
  else if (id === 'monkey') CREATURES.monkey(x, y + 4, t);
  else if (id === 'clipboard') CREATURES.monkey(x, y + 4, t, 'clipboard');
  else if (id === 'goggles') CREATURES.monkey(x, y + 4, t, 'goggles');
  else goopScientist(x, y + 100, .5, t, 0);
  ctx.restore();
}
function zoom(f, t, reduced) {
  black(1);
  if (f.evo < 0) {
    const u = zoomAt(f.local, reduced);
    space(t, '#0b0716', '#1b1654', [[GX, GY, 360, 'rgba(162,104,255,.2)']]);
    if (u < .45) {                                                                     // through a spiral arm
      const z = lerp(1, 7, smooth(u / .45));
      ctx.save(); ctx.translate(GX, GY); ctx.scale(z, z); ctx.translate(-GX - 60 * smooth(u / .45), -GY + 20 * smooth(u / .45));
      galaxy(GX, GY, 230, '#2b1b9e', '#fff3d6', t, .55, -.3, .25); ctx.restore();
    } else if (u < .72) {                                                              // past a star
      const v = (u - .45) / .27;
      faceStar(lerp(GX + 200, -200, smooth(v)), GY - 40, lerp(40, 220, v), '#ffd23f', '#fff3b0', t, 'calm');
    } else {                                                                           // to a molten planet, whose oceans form, slop green
      const v = (u - .72) / .28, r = lerp(60, 230, smooth(v)), ocean = smooth((v - .5) / .5);
      const C = P.circ(GX, GY, r); cut(C, mix('#ff5f1f', '#2f8fe8', ocean), { lw: 5, d: .6 });
      ctx.save(); ctx.clip(C);
      for (let i = 0; i < 7; i++) flat(P.ell(GX + Math.cos(i * 1.9) * r * .5, GY + Math.sin(i * 2.3) * r * .5, r * .3, r * .14, i), mix('#ffd23f', '#8fdc2f', ocean), .85);
      ctx.restore(); ctx.lineWidth = 5; ctx.strokeStyle = INK; ctx.stroke(C);
    }
  } else {                                                                             // eight stills, side-scrolling
    ctx.fillStyle = '#1b1654'; ctx.fillRect(-60, -60, W + 120, H + 120);
    const pos = (f.t - EVO_FROM) / EVO_EACH, slide = reduced ? Math.floor(pos) : Math.floor(pos) + smooth((pos % 1 - .75) / .25);
    for (let i = 0; i < EVOLUTION.length; i++) { const x = GX + (i - slide) * 320; if (x > -200 && x < W + 200) evolutionStill(i, x, GY, t); }
    for (let i = 0; i < 16; i++) { const x = ((i * 64 - (f.t - EVO_FROM) * (reduced ? 0 : 80)) % 1024 + 1024) % 1024 - 32; box(x, GY - 150, 30, 14, 'rgba(255,243,214,.25)'); box(x, GY + 136, 30, 14, 'rgba(255,243,214,.25)'); }
  }
}
/* ---------- beat 4: the lab, roles swapped ---------- */
const SWAP = { scientist: (x, y, s, t, fling) => goopScientist(x - 10, y - 10, s * 1.4, t, fling) };   // sized like the scientist it replaces
function feedAnim(L) {             // two feeds: fling at 5 s and 11 s into the beat
  for (const at of [5, 11]) if (L >= at && L < at + 1.6) return { fling: clamp((L - at) / .3, 0, 1), shot: clamp((L - at - .1) / .5, 0, 1), burp: L > at + .6 && L < at + 1.4 ? 1 : 0, float: L > at + .6 ? 1 - (L - at - .6) / 1.8 : 0 };
  for (const at of [5, 11]) if (L >= at + 1.6 && L < at + 2.4) return { fling: 1, shot: 1, burp: 0, float: 1 - (L - at - .6) / 1.8 };
  return { fling: 1, shot: 1, burp: 0, float: 0 };
}
function lab(f, t, reduced, zoomTo) {
  const sc = SCENES[0], L = f.local, fa = feedAnim(L);
  const a = { fling: fa.fling, r: 40, cy: 400, swap: SWAP, gone: new Set(), lookX: GX, lookY: GY };
  ctx.save();
  const z = zoomTo ? zoomTo.z : (reduced ? 1 : 1 + .4 * (1 - smooth(L / 2.5)));              // the camera settles, as after a stage change
  const zx = zoomTo ? zoomTo.x : 590, zy = zoomTo ? zoomTo.y : 400;
  ctx.translate(zx, zy); ctx.scale(z, z); ctx.translate(-zx, -zy);
  sc.back(t, .3, a); sc.mid(t, .3, a);
  toaster(806, 430, .62, t, { lookX: -1, lookY: .3 });                                      // on the counter. Judging.
  tinyHuman(590, 436, .62, t, zoomTo ? zoomTo.turn : 0, fa.burp);
  if (fa.shot > 0 && fa.shot < 1) {                                                          // a tiny spoonful in flight
    const u = fa.shot, x = lerp(330, 584, u), y = lerp(300, 372, u) - Math.sin(u * Math.PI) * 70;
    inked(P.circ(x, y, 6), '#ff8fc0', 2.5);
  }
  if (fa.float > 0) floatText('+1 grub', 640, 330 - (1 - fa.float) * 56, fa.float);
  sc.front(t, .3, a);
  ctx.restore();
}
/* ---------- beat 5: the stinger ---------- */
function stinger(f, t, reduced) {
  if (f.local < 1.5) {
    const u = smooth(f.local / (reduced ? .2 : .9));
    lab({ local: 20 }, t, reduced, { z: lerp(1, 3.2, u), x: 590, y: 380, turn: clamp((f.local - .6) / .5, 0, 1) });
  } else black(1);
}
/* ---------- beat 6: the landing ---------- */
function landing(f, t) {
  space(t, '#1b1654', '#3b1f78', [[GX, GY, 420, 'rgba(255,243,176,.18)']]);
  for (let i = 0; i < 5; i++) galaxy(120 + i * 180, 90 + (i % 2) * 60, 30, '#2b1b9e', '#fff3d6', t, .5, i, .4);
  goopScientist(170, 590, .95, t, 0, 1);                                                    // waving goodbye
  drawGoop({ x: 820, base: 470, grounded: false }, 70, 0, .2, t, { squash: 0, mouth: 0, lookX: 170, lookY: 400, mood: 'delighted' });   // a brand-new goop
}

// Draw the ending at `ct` seconds in. Returns the frame (beat, card) so the page can caption it.
export function drawEnding(ct, t, reduced) {
  const f = frameAt(ct, reduced);
  switch (f.beat) {
    case 'bite': bite(f, t); break;
    case 'bang': bang(f, t, reduced); break;
    case 'zoom': zoom(f, t, reduced); break;
    case 'lab': lab(f, t, reduced); break;
    case 'stinger': stinger(f, t, reduced); break;
    default: landing(f, t);
  }
  if (f.card) card(f.card.text, f.cardAlpha, f.card.on === 'black');
  black(f.black);
  return f;
}
export { star5 };

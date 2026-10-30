/* The ending, drawn in the canvas: six beats from cutscene.js. Reuses the game's own pieces: the goop
   sprite, the splash drops (here fifty times over, as sparks that cool into stars), the camera zoom,
   the stage 1 diorama with the roles swapped, and the float-number style for "+1 grub". */
import { P, cut, inked, flat, box, line, label, ctx, reduce, W, H, INK, PAPER, FONT, clamp, lerp, easeOut, rng, mix } from './draw.js';
import { frameAt, zoomAt, EVOLUTION, EVO_FROM, EVO_EACH, HANDOFF } from './cutscene.js';
import { drawGoop, EYES, GOOP } from './sprites/goop.js';
import { FOOD } from './sprites/food.js';
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
function floatText(txt, x, y, life) {               // exactly the game's "+12" (render.js): 28 px, rising 56 units as it fades
  ctx.save(); ctx.globalAlpha = clamp(life * 2.2, 0, 1); ctx.font = '400 28px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
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
function bang(f, t, reduced, noBlack) {
  if (!noBlack) black(1);
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
// Every creature is the goop, a few steps on: its lime body with the one flat shadow shape, its eye (a
// white disc, a big pupil, a glint), its smile and its drips. Each step keeps the last one's body.
const [GC, GS, GL] = GOOP[0];
function blob(x, y, rx, ry, t, ph = 0, n = 24) {
  const pts = [];
  for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, w = 1 + .05 * Math.sin(3 * a + (reduce ? 0 : t * 2) + ph) + .03 * Math.sin(5 * a - (reduce ? 0 : t * 2.6)); pts.push([x + Math.cos(a) * rx * w, y + Math.sin(a) * ry * w]); }
  return P.smooth(pts);
}
function goopBody(path, x, y, rx, ry) {             // drawGoop's own recipe: cut, one crescent of shade, two highlights
  cut(path, GC, { lw: 4.5, d: .8 });
  ctx.save(); ctx.clip(path);
  const c = new Path2D(); c.rect(x - rx * 3, y - ry * 3, rx * 6, ry * 6); c.ellipse(x - rx * .16, y - ry * .2, rx * 1.06, ry, 0, 0, 7);
  ctx.fillStyle = GS; ctx.fill(c, 'evenodd');
  flat(P.ell(x - rx * .42, y - ry * .5, rx * .26, ry * .13, -.6), GL, .9); flat(P.circ(x - rx * .13, y - ry * .7, Math.min(rx, ry) * .06), GL, .9);
  ctx.restore(); ctx.lineWidth = 4.5; ctx.strokeStyle = INK; ctx.stroke(path);
}
function goopEye(x, y, r, dx = -1, dy = .1) {       // the goop's eye: white, ink rim, a big pupil looking somewhere, a glint
  inked(P.circ(x, y, r), '#ffffff', clamp(r * .16, 2, 5));
  const l = Math.hypot(dx, dy) || 1, qx = x + dx / l * r * .4, qy = y + dy / l * r * .4;
  flat(P.circ(qx, qy, r * .46), INK); flat(P.circ(qx - r * .14, qy - r * .16, r * .13), '#ffffff');
}
function goopSmile(x, y, r) { ctx.beginPath(); ctx.arc(x, y - r * .5, r, Math.PI * .22, Math.PI * .78); ctx.strokeStyle = INK; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.stroke(); }
function drips(x, y, xs, t) {                       // the goop's drips: hanging from the underside, slowly stretching
  for (const [dx, len] of xs) { const l = len * (1 + (reduce ? 0 : .25 * Math.sin(t * 2 + dx))); line([[x + dx, y], [x + dx, y + l]], INK, 10); inked(P.ell(x + dx, y + l + 4, 5.5, 7), GC, 3); line([[x + dx, y - 6], [x + dx, y + l]], GC, 5); }
}
function limb(pts, w = 13) { line(pts, INK, w + 6); line(pts, GC, w); }
function paw(x, y, r = 8) { inked(P.circ(x, y, r), GC, 3.5); }
const CREATURES = {
  // 1. a goop-fish, its tail still in the goop-green sea, crawling out on two stubby fins
  fish(x, y, t) {
    const w = reduce ? 0 : Math.sin(t * 6) * .25;
    ctx.save(); ctx.translate(x + 40, y); ctx.rotate(w); cut(P.poly([[0, 0], [38, -26], [30, 0], [38, 26]]), GC, { lw: 4.5, d: .6 }); ctx.restore();
    limb([[x - 26, y + 16], [x - 40, y + 30]], 10); limb([[x + 6, y + 18], [x - 4, y + 32]], 10);
    goopBody(blob(x, y, 50, 30, t), x, y, 50, 30);
    drips(x, y + 26, [[-8, 14], [20, 9]], t);
    cut(P.poly([[x - 10, y - 26], [x + 10, y - 40], [x + 22, y - 24]]), GC, { lw: 4, d: .3 });
    goopEye(x - 20, y - 8, 14); goopSmile(x - 36, y + 12, 9);
  },
  // 2. a goop-lizard: the same blob, longer, on four legs, with the goop's second eye coming in
  lizard(x, y, t) {
    const T = new Path2D(); T.moveTo(x + 40, y - 6); T.quadraticCurveTo(x + 90, y - 2, x + 110, y + 22); T.quadraticCurveTo(x + 80, y + 12, x + 40, y + 12); T.closePath(); cut(T, GC, { lw: 4.5, d: .5 });
    for (const lx of [-34, -14, 18, 36]) limb([[x + lx, y + 10], [x + lx - 6, y + 30]], 9);
    for (const lx of [-34, -14, 18, 36]) paw(x + lx - 8, y + 32, 6);
    goopBody(blob(x, y, 58, 22, t, 1), x, y, 58, 22);
    drips(x, y + 19, [[-2, 9], [28, 7]], t);
    goopEye(x - 36, y - 6, 12); goopEye(x - 16, y - 12, 8); goopSmile(x - 48, y + 10, 7);
  },
  // 3. a goop with too many legs: rounder, up on eight of them, three eyes now
  legs(x, y, t) {
    for (let i = 0; i < 8; i++) { const lx = x - 46 + i * 13, k = reduce ? 0 : Math.sin(t * 9 + i) * 6; limb([[lx, y + 10], [lx + k * .5 - 3, y + 30], [lx + k, y + 48]], 7); paw(lx + k, y + 50, 5); }
    goopBody(blob(x, y, 52, 34, t, 2), x, y, 52, 34);
    drips(x, y + 30, [[-22, 10], [14, 14]], t);
    goopEye(x - 4, y - 12, 13); goopEye(x + 22, y - 4, 9); goopEye(x - 26, y - 2, 8); goopSmile(x, y + 16, 10);
  },
  // 4. a goop-frog: sitting up for the first time, two goop eyes on top, front arms on the sand
  frog(x, y, t) {
    for (const d of [-1, 1]) { goopBody(blob(x + d * 32, y + 34, 22, 14, t, d), x + d * 32, y + 34, 22, 14); }
    goopBody(blob(x, y, 40, 44, t, 3), x, y, 40, 44);
    drips(x, y + 40, [[-10, 8], [12, 11]], t);
    limb([[x - 26, y + 14], [x - 30, y + 40]], 10); limb([[x + 26, y + 14], [x + 30, y + 40]], 10); paw(x - 30, y + 42); paw(x + 30, y + 42);
    for (const d of [-1, 1]) { goopBody(blob(x + d * 18, y - 40, 15, 14, t, d * 2, 16), x + d * 18, y - 40, 15, 14); goopEye(x + d * 18, y - 40, 10, 0, 1); }
    goopSmile(x, y + 4, 14);
  },
  // 5. a goop-ape: upright, long goop arms down to the ground, a brow, two eyes, still dripping.
  // extra: 'clipboard' (6) or 'goggles' (7, a clipboard too: it is nearly a scientist)
  ape(x, y, t, extra) {
    const up = extra === 'goggles' ? 8 : extra === 'clipboard' ? 4 : 0;
    for (const d of [-1, 1]) { limb([[x + d * 14, y + 26], [x + d * 18, y + 54]], 13); inked(P.ell(x + d * 22, y + 56, 12, 6), GC, 3.5); }
    const by = y - up;
    goopBody(blob(x, by, 38, 48, t, 4), x, by, 38, 48);
    drips(x, by + 44, [[-16, 9], [6, 13]], t);
    flat(P.ell(x, by - 18, 30, 7), GS);                                                 // the brow
    const sw = reduce ? 0 : Math.sin(t * 3) * 4;
    limb([[x - 32, by - 6], [x - 50, by + 22], [x - 52, by + 56 + sw]], 12); paw(x - 52, by + 60 + sw, 9);
    if (extra) { limb([[x + 32, by - 6], [x + 46, by + 14], [x + 30, by + 26]], 12); }
    else { limb([[x + 32, by - 6], [x + 50, by + 22], [x + 52, by + 56 - sw]], 12); paw(x + 52, by + 60 - sw, 9); }
    if (extra === 'goggles') { inked(P.rect(x - 38, by - 18, 76, 10, 4), '#3b2a63', 3); for (const ex of [-14, 14]) { inked(P.circ(x + ex, by - 12, 14), '#8f9bb8', 3.5); goopEye(x + ex, by - 12, 9.5, 0, .3); } }
    else { goopEye(x - 13, by - 8, 11, .4, .3); goopEye(x + 14, by - 6, 9, .4, .3); }
    goopSmile(x, by + 16, 12);
    if (extra) {                                                                        // a clipboard, held to the chest
      ctx.save(); ctx.translate(x + 26, by + 22); ctx.rotate(-.18); cut(P.rect(-16, -20, 32, 42, 3), '#b98852', { lw: 3, d: .5 }); inked(P.rect(-12, -14, 24, 30, 2), PAPER, 2); for (const ly of [-6, 0, 6]) line([[-7, ly], [7, ly]], INK, 1.5); inked(P.rect(-6, -23, 12, 6, 2), '#c9cfdf', 2); ctx.restore();
      paw(x + 30, by + 28, 9);
      line([[x - 30, by - 40], [x - 12, by - 52]], INK, 6); line([[x - 30, by - 40], [x - 12, by - 52]], '#ffd23f', 3);   // a pencil, tucked into the goop
    }
  },
};
function evolutionStill(i, x, y, t) {
  const id = EVOLUTION[i];
  ctx.save(); ctx.translate(x, y);
  cut(P.rect(-140, -120, 280, 240, 10), PAPER, { lw: 5, d: 1.2 });
  flat(P.rect(-128, -108, 256, 216), '#5fd0f0');
  flat(P.rect(-128, -6, 256, 30), GC); for (let k = 0; k < 6; k++) flat(P.ell(-110 + k * 46, -6, 18, 5), GL, .8);   // the goop-green sea
  flat(P.rect(-128, 24, 256, 84), '#f2c27a'); line([[-128, 24], [128, 24]], INK, 3);                                // the shore
  ctx.lineWidth = 5; ctx.strokeStyle = INK; ctx.strokeRect(-128, -108, 256, 216);
  label((i + 1) + '/8', 100, -88, 18, INK);
  ctx.restore();
  ctx.save(); ctx.beginPath(); ctx.rect(x - 128, y - 108, 256, 216); ctx.clip();
  if (id === 'fish') CREATURES.fish(x - 6, y + 22, t);
  else if (id === 'lizard') CREATURES.lizard(x - 16, y + 26, t);
  else if (id === 'legs') CREATURES.legs(x, y + 6, t);
  else if (id === 'frog') CREATURES.frog(x, y + 14, t);
  else if (id === 'ape') CREATURES.ape(x, y + 8, t);
  else if (id === 'clipboard') CREATURES.ape(x, y + 8, t, 'clipboard');
  else if (id === 'goggles') CREATURES.ape(x, y + 8, t, 'goggles');
  else goopScientist(x, y + 106, .6, t, 0);
  ctx.restore();
}
// The hand-off from beat 2: the camera dives from the goop's belly into the first galaxy the sparks made,
// which opens out into the spiral the zoom flies through.
function handoff(L, t, reduced) {
  const steps = reduced ? 3 : 0, raw = clamp(L / HANDOFF, 0, 1), u = steps ? Math.floor(raw * steps) / steps : smooth(raw);
  const tx = GX + GAL[0][0] * .5, ty = GY + GAL[0][1] * .5 * .55 + 4, z = lerp(1, 9, u * u);
  ctx.save(); ctx.translate(GX, GY); ctx.scale(z, z); ctx.translate(-lerp(GX, tx, smooth(Math.min(1, raw * 1.5))), -lerp(GY, ty, smooth(Math.min(1, raw * 1.5))));
  bang({ local: 16 }, t, reduced, true);
  ctx.restore();
  const a = smooth((raw - .55) / .45);
  if (a > 0) { ctx.save(); ctx.globalAlpha = a; space(t, '#0b0716', '#1b1654', [[GX, GY, 360, 'rgba(162,104,255,.2)']]); galaxy(GX, GY, 230, '#2b1b9e', '#fff3d6', t, .55, -.3, .25); ctx.restore(); }
}
function zoom(f, t, reduced) {
  black(1);
  if (f.local < HANDOFF) { handoff(f.local, t, reduced); return; }
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
    } else {                                                                           // to a molten planet, whose oceans form, the goop's own green
      const v = (u - .72) / .28, r = lerp(60, 230, smooth(v)), ocean = smooth((v - .4) / .5);
      const C = P.circ(GX, GY, r); cut(C, mix('#ff5f1f', GC, ocean), { lw: 5, d: .6 });
      ctx.save(); ctx.clip(C);
      flat(P.ell(GX - r * .3, GY - r * .5, r * .5, r * .2, -.4), mix('#ffb01f', GL, ocean), .8);
      for (let i = 0; i < 7; i++) flat(P.ell(GX + Math.cos(i * 1.9) * r * .5, GY + Math.sin(i * 2.3) * r * .5, r * .3, r * .14, i), mix('#ffd23f', '#c98f4a', ocean), .9);
      ctx.restore(); ctx.lineWidth = 5; ctx.strokeStyle = INK; ctx.stroke(C);
    }
  } else {                                                                             // eight stills, side-scrolling
    ctx.fillStyle = '#1b1654'; ctx.fillRect(-60, -60, W + 120, H + 120);
    const pos = (f.t - EVO_FROM) / EVO_EACH, slide = reduced ? Math.floor(pos) : Math.floor(pos) + smooth((pos % 1 - .75) / .25);
    const end = reduced ? 0 : smooth((f.local - 19.3) / .7);                           // the last still grows into stage 1's lab
    ctx.save(); if (end > 0) { const z = lerp(1, 2.6, end); ctx.translate(GX, GY + 40); ctx.scale(z, z); ctx.translate(-GX, -GY - 40); }
    for (let i = 0; i < EVOLUTION.length; i++) { const x = GX + (i - Math.min(slide, EVOLUTION.length - 1)) * 320; if (x > -200 && x < W + 200) evolutionStill(i, x, GY, t); }
    for (let i = 0; i < 16; i++) { const x = ((i * 64 - (f.t - EVO_FROM) * (reduced ? 0 : 80)) % 1024 + 1024) % 1024 - 32; box(x, GY - 150, 30, 14, 'rgba(255,243,214,.25)'); box(x, GY + 136, 30, 14, 'rgba(255,243,214,.25)'); }
    ctx.restore();
  }
}
/* ---------- beat 4: the lab, roles swapped ---------- */
// Stage 1's lab, exactly: the scene file itself, with the goop scientist where the scientist stands and
// the tiny human where the goop sits. Each feed copies the game's: the spoon arm swings, a stage 1 snack
// arcs over (0.42 s, as a hand feed flies), and on landing the human squashes, opens wide, splashes and
// burps, and "+1 grub" floats up in the "+12" style.
const SWAP = { scientist: (x, y, s, t, fling) => goopScientist(x - 10, y - 10, s * 1.4, t, fling) };   // sized like the scientist it replaces
export const FEEDS = [5, 11];                      // seconds into the beat (cutscene.js cues them at 47 and 53)
const HX = 590, HY = 436, HS = .62, FLY = .42;     // the human's feet and size; a hand feed's flight time
const MOUTH = [HX + 2, HY - 122 * HS];
function feedAnim(L) {
  let at = null; for (const a of FEEDS) if (L >= a) at = a;
  if (at == null || L > at + 2.6) return { fling: 1, shot: -1, hit: -1 };
  return { fling: clamp((L - at) / .3, 0, 1), shot: (L - at - .1) / FLY, hit: L - at - .1 - FLY };
}
const DROPS = (() => { const r = rng(91); return Array.from({ length: 8 }, () => ({ a: -Math.PI / 2 + (r() - .5) * 2.2, v: 90 + r() * 160, r: 3 + r() * 4 })); })();
function lab(f, t, reduced, zoomTo) {
  const sc = SCENES[0], L = f.local, fa = feedAnim(L);
  const a = { fling: fa.fling, r: 40, cy: 400, swap: SWAP, gone: new Set(), lookX: GX, lookY: GY };
  ctx.save();
  // the camera settles from the goop scientist, where the last evolution still left it
  const settle = reduced ? 1 : smooth(L / 2.5), z = zoomTo ? zoomTo.z : lerp(1.9, 1, settle);
  const zx = zoomTo ? zoomTo.x : lerp(214, 480, settle), zy = zoomTo ? zoomTo.y : lerp(400, 300, settle);
  ctx.translate(zx, zy); ctx.scale(z, z); ctx.translate(-zx, -zy);
  sc.back(t, .3, a); sc.mid(t, .3, a);
  toaster(806, 430, .62, t, { lookX: -1, lookY: .3 });                                      // on the counter. Judging.
  // the feed lands: the game's squash spring (a damped wobble), mouth open, then the burp
  const h = fa.hit, squash = h >= 0 && h < 1.2 ? Math.sin(h * 14) * Math.exp(-h * 4) * .9 : 0;
  const open = h >= 0 && h < .5 ? 1 - h / .5 : h >= .55 && h < 1.1 ? 1 : 0;
  tinyHuman(HX, HY, HS, t, zoomTo ? zoomTo.turn : 0, open, squash);
  if (fa.shot > 0 && fa.shot < 1) {                                                          // a stage 1 snack, in flight
    const u = fa.shot, x = lerp(330, MOUTH[0], u), y = lerp(300, MOUTH[1], u) - Math.sin(u * Math.PI) * 90 * .7, sh = .55 * (1 - clamp((u - .78) / .22, 0, 1) * .7);
    ctx.save(); ctx.translate(x, y); ctx.rotate(reduce ? 0 : u * 4); ctx.scale(sh, sh); FOOD[0][0](); ctx.restore();
  }
  if (h >= 0 && h < .9) for (const d of DROPS) {                                             // the splash, as the goop's: orange drops, falling
    const x = MOUTH[0] + Math.cos(d.a) * (16 + d.v * h * .5), y = MOUTH[1] + 6 + Math.sin(d.a) * d.v * h * .6 + 380 * h * h * .5;
    ctx.globalAlpha = clamp((.9 - h) * 3, 0, 1); inked(P.circ(x, y, d.r * HS * 1.4), '#ffb01f', 2); ctx.globalAlpha = 1;
  }
  if (h >= .55 && h < 1.2) { ctx.globalAlpha = clamp((1.2 - h) * 3, 0, 1); label('burp', MOUTH[0] + 40, MOUTH[1] - 20 - (h - .55) * 30, 20, PAPER); ctx.globalAlpha = 1; }
  if (h >= 0) { const life = 1 - h * 1.1; if (life > 0) floatText('+1 grub', MOUTH[0] + 12, MOUTH[1] - 44 - (1 - life) * 56, life); }
  sc.front(t, .3, a);
  ctx.restore();
}
/* ---------- beat 5: the stinger ---------- */
// The human close up: it turns from its feeder to the camera. Then three cards on black.
export const STING_TURN = [.7, 1.2], STING_BLACK = 2.2;
function stinger(f, t, reduced) {
  if (f.local < STING_BLACK) {
    const u = smooth(f.local / (reduced ? .2 : 1));
    lab({ local: 20 }, t, reduced, { z: lerp(1, 4.2, u), x: HX, y: HY - 50, turn: clamp((f.local - STING_TURN[0]) / (STING_TURN[1] - STING_TURN[0]), 0, 1) });
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

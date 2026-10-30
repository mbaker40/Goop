/* Drawing a frame: the diorama in parallax layers, the goop, flying snacks, events, floating numbers,
   then paper grain over everything. */
import { P, inked, cut, flat, ctx, S, setContext, setScale, reduce, W, H, INK, PAPER, FONT, clamp, lerp, rng } from './draw.js';
import { FOOD } from './sprites/food.js';
import { drawGoop } from './sprites/goop.js';
import { drawTarget, tag, stopwatch } from './sprites/events.js';
import { SCENES } from './scenes/index.js';
import { isHazard, isChoice } from './events.js';
import { G, anim, par, shots, drops, floats, view } from './game.js';
import { goneIn, milestonesIn } from './milestones.js';
import { drawEnding } from './ending.js';

let cv = null, grain = null, grainPat = null;
export function initCanvas(canvas) {
  cv = canvas; setContext(cv.getContext('2d'));
  grain = (() => { const c = document.createElement('canvas'); c.width = c.height = 160; const x = c.getContext('2d'), im = x.createImageData(160, 160), r = rng(5); for (let i = 0; i < im.data.length; i += 4) { const v = 196 + Math.floor(r() * 60); im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; } x.putImageData(im, 0, 0); return c; })();
}
export function fit() { const w = cv.clientWidth || 640, dpr = Math.min(window.devicePixelRatio || 1, 2); cv.width = Math.round(w * dpr); cv.height = Math.round(w * dpr * H / W); setScale(cv.width / W); grainPat = null; }
function layer(z, fn) { ctx.save(); ctx.translate(-par.x * z, -par.y * z * .5); fn(); ctx.restore(); }   // nearer layers slide further: that's the depth

function drawEvent(ev, t) {
  const def = ev.def, hazard = isHazard(def), choice = isChoice(def);
  const intro = clamp((3 - ev.age) / .5, 0, 1);                  // spawn labels fade out after three seconds
  let mx = 0, my = 0;
  for (const tg of ev.targets) {
    const [x, y] = drawTarget(tg, ev, t, par.x, par.y);
    mx += x / ev.targets.length; my += y / ev.targets.length;
    if (hazard) { stopwatch(x + 44, y - 58, 15, 1 - ev.age / ev.life); tag(def.label, x, y + 84, 22, 1); }
    else if (choice) tag(tg.label, x, y + 52, 20, 1);
    else tag(def.label, x, y + 52, 22, intro);
  }
  if (choice) tag(def.label, mx, my - 74, 24, intro, '#ffd23f');
}

// The goop's speech bubble: a paper cutout with a tail, above and to one side of the goop. Its text is
// sized for a phone: never smaller than about 11 CSS pixels.
function bubble(text, alpha, g, a) {
  if (!text || alpha <= 0) return;
  const css = cv.clientWidth ? cv.clientWidth / W : 1, size = clamp(11.5 / css, 22, 36);
  ctx.save(); ctx.globalAlpha = clamp(alpha, 0, 1);
  ctx.font = '400 ' + size + 'px ' + FONT;
  const words = text.split(' '), lines = []; let cur = '';
  const maxW = Math.min(380, W * .44);
  for (const w of words) { const tryL = cur ? cur + ' ' + w : w; if (ctx.measureText(tryL).width > maxW && cur) { lines.push(cur); cur = w; } else cur = tryL; }
  if (cur) lines.push(cur);
  const bw = Math.max(...lines.map(l => ctx.measureText(l).width)) + 36, bh = lines.length * size * 1.15 + 22;
  const left = g.x > W / 2;                                         // put it on the roomier side
  let bx = left ? g.x - a.r * .6 - bw : g.x + a.r * .6, by = a.cy - a.r - bh * .6;
  bx = clamp(bx, 12, W - bw - 12); by = clamp(by, 12, H - bh - 12);
  const tx = clamp(g.x + (left ? -a.r * .35 : a.r * .35), bx + 20, bx + bw - 20), ty = by + bh;
  const B = P.rect(bx, by, bw, bh, 14);
  cut(B, PAPER, { lw: 4, d: .8 });
  const T = P.poly([[tx - 14, ty - 3], [tx + 14, ty - 3], [tx + (left ? 22 : -22) * .3, ty + 24]]);
  inked(T, PAPER, 4); flat(P.rect(tx - 12, ty - 8, 24, 7), PAPER);
  ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  lines.forEach((l, i) => ctx.fillText(l, bx + bw / 2, by + 11 + size * .6 + i * size * 1.15));
  ctx.restore();
}

function grainOver() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);                                    // paper grain over everything
  ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = .4;
  ctx.fillStyle = grainPat || (grainPat = ctx.createPattern(grain, 'repeat')); ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
}

export function render(t) {
  if (G.cut) {                                                            // the ending takes over the theatre
    ctx.setTransform(S, 0, 0, S, 0, 0); ctx.clearRect(0, 0, W, H); ctx.globalAlpha = 1;
    G.cut.frame = drawEnding(G.cut.t, t, reduce);
    grainOver();
    return;
  }
  const { k, p } = view(), sc = SCENES[k], g = sc.goop, a = anim;
  a.gone = G.peek == null ? goneIn(G.state.miles, k) : new Set(milestonesIn(k).filter(m => m.f <= p && m.hide).map(m => m.hide));
  a.ate = G.peek == null && G.state.ate;
  a.r = lerp(a.r, lerp(g.r0, g.r1, Math.pow(p, .85)), .14);
  a.cy = g.grounded ? g.base - a.r * .7 * (1 - a.squash * .12) : g.base;
  a.won = G.state.won && G.peek == null;
  ctx.setTransform(S, 0, 0, S, 0, 0); ctx.clearRect(0, 0, W, H); ctx.globalAlpha = 1;
  if (a.zoom > 1.002) { ctx.translate(g.x, a.cy); ctx.scale(a.zoom, a.zoom); ctx.translate(-g.x, -a.cy); }     // camera pulls back after each stage change
  let lx = a.lookX, ly = a.lookY; const s0 = shots.find(s => !s.auto) || shots[0]; if (s0) { lx = lerp(s0.x0, s0.x1, s0.u); ly = lerp(s0.y0, s0.y1, s0.u) - Math.sin(s0.u * Math.PI) * 90; }
  layer(5, () => sc.back(t, p, a));
  layer(11, () => sc.mid(t, p, a));
  layer(16, () => {
    drawGoop(g, a.r, k, p, t, { squash: clamp(a.squash, -1, 1), mouth: a.mouth, lookX: lx, lookY: ly, mood: G.peek == null ? G.mood.id : 'content' });
    for (const s of shots) {
      const x = lerp(s.x0, s.x1, s.u), y = lerp(s.y0, s.y1, s.u) - Math.sin(s.u * Math.PI) * (s.auto ? 60 : 90), sh = s.sc * (1 - clamp((s.u - .78) / .22, 0, 1) * .7);
      ctx.save(); ctx.translate(x, y); ctx.rotate(reduce ? 0 : s.rot + s.spin * s.u); ctx.scale(sh, sh); FOOD[s.k][s.kind](); ctx.restore();
    }
    for (const d of drops) { ctx.globalAlpha = clamp(d.life * 3, 0, 1); inked(P.circ(d.x, d.y, d.r), d.col || '#ffb01f', 2.5); } ctx.globalAlpha = 1;
  });
  layer(26, () => sc.front(t, p, a));
  if (G.ev) layer(20, () => drawEvent(G.ev, t));
  layer(16, () => {
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    for (const f of floats) { ctx.globalAlpha = clamp(f.life * 2.2, 0, 1); ctx.font = '400 28px ' + FONT; ctx.lineWidth = 6; ctx.strokeStyle = INK; const y = f.y - (1 - f.life) * 56; ctx.strokeText(f.txt, f.x, y); ctx.fillStyle = PAPER; ctx.fillText(f.txt, f.x, y); }
    ctx.globalAlpha = 1;
  });
  if (G.peek == null && G.mood.text) layer(16, () => bubble(G.mood.text, Math.min(1, G.mood.life * 2.5, (4.6 - G.mood.life) * 4 + 1), g, a));
  grainOver();
}

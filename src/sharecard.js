/* The share card: a PNG of the goop at its furthest stage, in its diorama, with the numbers that matter.
   Drawn to an offscreen canvas in the game's cardboard-cutout style, then copied or shared. The words come
   from share.js (pure); this file only draws and hands the picture to the browser. */
import { P, cut, inked, flat, ctx, INK, EDGE, PAPER, FONT, W, H } from './draw.js';
import { withContext, goopAt } from './portrait.js';
import { SCENES } from './scenes/index.js';
import { goopColours } from './sprites/goop.js';
import { BADGE_BY_ID } from './achievements.js';
import { shareFileName } from './share.js';

export const CARD_W = 1200, CARD_H = 630;
const NIGHT = '#2b2150', NIGHT2 = '#3b2e6c', KRAFT = '#dcb27e', KRAFT_LO = '#b98852', GOOP = '#8fdc2f', MUTE = '#cdc2f0';
const MEDALS = ['#8fdc2f', '#22c3b0', '#ffb01f', '#ff5f8f', '#a268ff', '#56b4ff'];
const BODY = '"Nunito","Avenir Next","Segoe UI",system-ui,sans-serif';

// The stage's diorama, as the game draws it at 72% through the stage, scaled into a box.
function diorama(k, universe, x, y, w, h) {
  const sc = SCENES[k], g = sc.goop, p = .72;
  const r = g.r0 + (g.r1 - g.r0) * Math.pow(p, .85);
  const a = { r, cy: g.grounded ? g.base - r * .7 : g.base, squash: 0, mouth: 0, fling: 1, zoom: 1, won: true, ate: universe, gone: new Set(), lookX: W / 2, lookY: H / 2 };
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.translate(x, y); ctx.scale(w / W, h / H);
  try {
    sc.back(0, p, a); sc.mid(0, p, a);
    goopAt(g.x, a.cy, r, k, { p, lookX: W * .7, lookY: H * .4, mood: 'smug' });
    sc.front(0, p, a);
  } catch (e) {                                   // a scene that wants more than this gives a plain backdrop
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = NIGHT2; ctx.fillRect(x, y, w, h);
  }
  ctx.restore();
}
function text(t, x, y, size, fill, { font = FONT, weight = 400, align = 'left', shadow = null, max } = {}) {
  ctx.font = weight + ' ' + size + 'px ' + font; ctx.textAlign = align; ctx.textBaseline = 'alphabetic';
  if (shadow) { ctx.fillStyle = INK; ctx.fillText(t, x + 3, y + 3, max); ctx.fillStyle = shadow; ctx.fillText(t, x + 4, y + 5, max); ctx.fillStyle = INK; ctx.fillText(t, x + 3, y + 3, max); }
  ctx.fillStyle = fill; ctx.fillText(t, x, y, max);
}
function medal(x, y, r, i, id) {
  cut(P.circ(x, y, r), MEDALS[i % MEDALS.length], { lw: 3.5, d: .6 });
  const name = (BADGE_BY_ID[id] && BADGE_BY_ID[id].name) || '?';
  text(name.replace(/^[^A-Za-z0-9]+/, '').charAt(0).toUpperCase(), x, y + r * .42, r * 1.15, INK, { align: 'center' });
}

// Draw the card for a share.js model. Returns the canvas.
export function drawShareCard(model, canvas = document.createElement('canvas')) {
  canvas.width = CARD_W; canvas.height = CARD_H;
  const c2d = canvas.getContext('2d');
  withContext(c2d, 1, c => {
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.fillStyle = NIGHT; c.fillRect(0, 0, CARD_W, CARD_H);
    // the toy theatre: kraft frame, ink border, the diorama inside
    const fx = 36, fy = 36, fw = 640, fh = 400;
    cut(P.rect(fx - 12, fy - 12, fw + 24, fh + 24, 16), KRAFT, { lw: 5, d: 1 });
    diorama(model.stage, model.universe, fx, fy, fw, fh);
    c.lineWidth = 4; c.strokeStyle = INK; c.strokeRect(fx, fy, fw, fh);
    // the badge shelf under it
    const by = 470;
    cut(P.rect(24, by, 664, 124, 14), KRAFT, { lw: 4, d: .8 });
    text(model.badgeCount + ' of ' + model.badgeTotal + ' badges', 44, by + 34, 24, INK);
    if (model.badges.length) model.badges.forEach((id, i) => medal(64 + i * 46, by + 80, 19, i, id));
    else text('No badges yet. Give it time.', 44, by + 86, 22, INK, { font: BODY, weight: 800 });
    if (model.more) text('+' + model.more, 50 + model.badges.length * 46, by + 89, 24, INK);
    // the words
    const tx = 724;
    text('Feed the Goop', tx, 96, 58, GOOP, { shadow: KRAFT_LO, max: 440 });
    text(model.name + '\'s goop', tx, 150, 30, PAPER, { font: BODY, weight: 900, max: 440 });
    const [col] = goopColours(model.stage, .5);
    const tag = P.rect(tx, 170, 440, 58, 10);
    cut(tag, col, { lw: 4, d: .7 });
    text(model.title, tx + 16, 208, model.title.length > 30 ? 21 : 25, INK, { max: 408 });
    let y = 274;
    for (const [k, v] of model.rows) {
      text(k, tx, y, 22, MUTE, { font: BODY, weight: 800 });
      text(v, tx + 440, y, 28, PAPER, { align: 'right' });
      c.strokeStyle = NIGHT2; c.lineWidth = 2; c.setLineDash([3, 6]); c.beginPath(); c.moveTo(tx, y + 12); c.lineTo(tx + 440, y + 12); c.stroke(); c.setLineDash([]);
      y += 50;
    }
    // the link, on a paper tag, bottom right
    const url = model.url.replace(/^https?:\/\//, '').replace(/\/$/, '');
    cut(P.rect(tx, 548, 440, 46, 10), PAPER, { lw: 4, d: .7 });
    text(url, tx + 220, 580, 24, INK, { align: 'center', max: 410 });
  });
  return canvas;
}

export function cardBlob(canvas) { return new Promise(res => canvas.toBlob(b => res(b), 'image/png')); }
// Copy the picture. Resolves true when the clipboard took it; false means show it for a long-press save.
export async function copyCard(canvas) {
  try {
    if (!navigator.clipboard || typeof window.ClipboardItem !== 'function') return false;
    await navigator.clipboard.write([new window.ClipboardItem({ 'image/png': cardBlob(canvas) })]);
    return true;
  } catch (e) { return false; }
}
// Share it: with the picture where the browser can share files, else the link. Resolves 'shared',
// 'link-copied', 'cancelled' or 'failed'.
export async function shareCard(canvas, model) {
  try {
    const blob = await cardBlob(canvas);
    const file = blob && typeof File === 'function' ? new File([blob], shareFileName(model.name), { type: 'image/png' }) : null;
    if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: 'Feed the Goop', text: model.text });
      return 'shared';
    }
    if (navigator.share) { await navigator.share({ title: 'Feed the Goop', text: model.text, url: model.url }); return 'shared'; }
  } catch (e) { if (e && e.name === 'AbortError') return 'cancelled'; }
  try { await navigator.clipboard.writeText(model.text); return 'link-copied'; } catch (e) { return 'failed'; }
}
export { EDGE, inked, flat };

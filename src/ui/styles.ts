/**
 * styles.ts — M0 "playable ugly" DOM styling (PLAN §17 M0: ugly before goopy).
 * Deliberately minimal; the juicy 3D/skins come in later milestones.
 */

export const CSS = `
:root {
  --bg: #14121a; --panel: #1e1b28; --panel2: #262233; --ink: #e9e4f5;
  --muted: #9a90b5; --accent: #7ee081; --goop: #b6e84a; --danger: #ff5d5d;
  --warn: #ffb03a; --border: #35304a;
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--ink);
  font: 15px/1.4 ui-monospace, "SF Mono", Menlo, Consolas, monospace; }
/* Full-viewport 3D canvas sits behind the DOM overlay and never intercepts pointer events
   (the tower is clicked via DOM delegation on #app). */
#scene { position: fixed; inset: 0; width: 100vw; height: 100vh; display: block;
  z-index: 0; pointer-events: none; }
#app { position: relative; z-index: 1; max-width: 1100px; margin: 0 auto; padding: 12px; }
h1 { font-size: 28px; letter-spacing: 2px; margin: 8px 0; }
h2 { font-size: 16px; margin: 12px 0 6px; color: var(--muted); text-transform: uppercase; letter-spacing: 1px; }
button { font: inherit; cursor: pointer; background: var(--panel2); color: var(--ink);
  border: 1px solid var(--border); border-radius: 8px; padding: 8px 12px; }
button:hover:not(:disabled) { border-color: var(--accent); }
button:disabled { opacity: .4; cursor: not-allowed; }
.row { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
.grid { display: grid; grid-template-columns: 1fr 340px; gap: 14px; align-items: start; }
@media (max-width: 780px) { .grid { grid-template-columns: 1fr; } }
.panel { background: var(--panel); border: 1px solid var(--border); border-radius: 12px; padding: 12px; }
.stat { display: flex; justify-content: space-between; gap: 12px; padding: 3px 0; }
.stat b { color: var(--goop); font-variant-numeric: tabular-nums; }
/* ---- Run-screen HUD floating over the full-viewport 3D stage ----
   #stage is a transparent click-catcher (the tower is behind it on the canvas); its CSS rect is
   also what the renderer frames the tower into, so sizing it per-orientation aligns the 3D tower. */
html, body { overflow-x: hidden; }
#stage { position: fixed; z-index: 0; touch-action: manipulation; }
/* Melt-warning vignette: darkens/tints the screen edges as the buffer runs low; the off-centre
   focus + heavier bottom give the "droop" feel. Opacity is driven from JS (updateRun). */
#meltvig { position: fixed; inset: 0; z-index: 1; pointer-events: none; opacity: 0; transition: opacity .3s ease;
  background: radial-gradient(130% 90% at 50% 32%, transparent 42%, rgba(180,90,20,.55) 100%); }
#meltvig.red { background: radial-gradient(130% 95% at 50% 28%, transparent 36%, rgba(150,15,12,.72) 100%); }
#meltvig.collapse { animation: meltpulse .5s ease-in-out infinite; }
@keyframes meltpulse { 0%,100% { opacity: .6 !important; } 50% { opacity: .9 !important; } }
#hud { position: fixed; inset: 0; z-index: 2; pointer-events: none; }
#hud-stats, #hud-shop { pointer-events: auto; }
#sr-banner, #hud-readout { pointer-events: none; }
.hud-card { background: rgba(30,27,40,.82); border: 1px solid var(--border); border-radius: 12px;
  padding: 10px 12px; -webkit-backdrop-filter: blur(6px); backdrop-filter: blur(6px); }
#hud-stats { position: fixed; top: 12px; left: 12px; min-width: 190px; }
#hud-stats .title { color: var(--goop); font-weight: bold; letter-spacing: 1px; }
button { min-height: 40px; } /* tap targets ≥ 44px-ish */
button.mini { min-height: 32px; padding: 4px 10px; }
#sr-banner { position: fixed; top: 12px; left: 50%; transform: translateX(-50%); max-width: 70vw; margin: 0; }
#hud-readout { position: fixed; bottom: 16px; text-align: center; }
#hud-readout .h { font-size: 34px; color: var(--goop); text-shadow: 0 2px 10px rgba(0,0,0,.75); }
#hud-readout .z { font-size: 16px; color: var(--ink); text-shadow: 0 1px 8px rgba(0,0,0,.85); }
#hud-readout .hint { font-size: 12px; color: var(--ink); opacity: .85; margin-top: 4px; text-shadow: 0 1px 8px #000; }
#hud-readout #sr-combo-label { color: var(--ink); font-size: 12px; text-shadow: 0 1px 6px #000; margin-top: 8px; }
#hud-readout .combo { width: min(360px, 72vw); margin: 4px auto 0; }
#hud-shop { position: fixed; background: rgba(18,16,24,.94); border: 1px solid var(--border);
  overflow-y: auto; overscroll-behavior: contain; }
#shop-toggle { width: 100%; }
#shop-body .panel { margin-bottom: 12px; }

/* Landscape: shop docked right; stage = the clear left area. */
@media (orientation: landscape) {
  #stage { top: 0; left: 0; bottom: 0; right: 360px; }
  #hud-readout { left: 0; right: 360px; }
  #hud-shop { top: 0; right: 0; width: 340px; height: 100vh; padding: 12px; }
  #hud-shop.collapsed { width: auto; height: auto; }
  #hud-shop.collapsed #shop-body { display: none; }
}

/* Portrait: bottom-sheet shop; stage = the upper area; slim stat bar. */
@media (orientation: portrait) {
  #hud-stats { left: 8px; right: 8px; top: 8px; min-width: 0;
    display: flex; gap: 14px; align-items: center; flex-wrap: wrap; }
  #hud-stats .stat { padding: 0; }
  #sr-banner { top: 66px; }
  #stage { top: 0; left: 0; right: 0; bottom: 44vh; }
  #hud-readout { left: 0; right: 0; bottom: calc(44vh + 8px); }
  #hud-shop { left: 0; right: 0; bottom: 0; max-height: 64vh; border-radius: 16px 16px 0 0;
    padding: 6px 12px calc(16px + env(safe-area-inset-bottom)); transition: transform .25s ease; }
  #hud-shop.collapsed { transform: translateY(calc(100% - 54px)); }
  #shop-toggle { margin-bottom: 8px; }
}
.banner { padding: 10px 12px; border-radius: 10px; margin: 10px 0; text-align: center; font-weight: bold; }
.banner.safe { background: #1c2a1c; color: var(--accent); }
.banner.orange { background: #3a2c14; color: var(--warn); }
.banner.red { background: #3a1616; color: var(--danger); animation: pulse .7s infinite; }
.banner.grace { background: #16233a; color: #7fb3ff; }
@keyframes pulse { 50% { opacity: .55; } }
.shopitem { display: flex; justify-content: space-between; align-items: center; gap: 8px;
  padding: 8px; border: 1px solid var(--border); border-radius: 8px; margin-bottom: 6px; background: var(--panel2); }
.shopitem .info { min-width: 0; }
.shopitem .name { font-weight: bold; }
.shopitem .flavor { color: var(--muted); font-size: 12px; }
.shopitem .cost { white-space: nowrap; color: var(--goop); font-variant-numeric: tabular-nums; }
.combo { height: 10px; background: var(--panel2); border-radius: 6px; overflow: hidden; border: 1px solid var(--border); }
.combo > i { display: block; height: 100%; background: linear-gradient(90deg, var(--goop), var(--accent)); }
.center { text-align: center; }
.big { font-size: 42px; color: var(--goop); }
.tag { font-size: 12px; color: var(--muted); }
textarea { width: 100%; height: 70px; background: var(--panel2); color: var(--ink); border: 1px solid var(--border); border-radius: 8px; }
`;

export function injectStyles(): void {
  const el = document.createElement('style');
  el.textContent = CSS;
  document.head.appendChild(el);
}

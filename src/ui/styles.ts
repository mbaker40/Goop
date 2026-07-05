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
/* Always-on build stamp (cache diagnostic). Fixed + own GPU layer so it shows above the WebGL
   canvas on iOS; sits on <body>, never wiped by a screen render. Highest z so nothing hides it. */
#build-badge { position: fixed; top: calc(2px + env(safe-area-inset-top)); left: 50%; transform: translateX(-50%) translateZ(0);
  z-index: 2147483647; pointer-events: none; background: rgba(10,8,16,.82); color: #7ee081;
  font: 11px/1.3 ui-monospace, Menlo, monospace; padding: 2px 8px; border-radius: 0 0 8px 8px;
  border: 1px solid var(--border); border-top: none; letter-spacing: .3px; white-space: nowrap; }
/* iOS Safari auto-promotes a WebGL canvas to its OWN GPU compositing layer, which then paints
   ABOVE any plain (non-composited) DOM regardless of z-index — that's what stranded the whole
   overlay on a bare tower. The fix is NOT z-index games (a negative z-index actually HIDES the
   canvas on compliant browsers, behind the body background). Instead we force BOTH the canvas and
   every DOM overlay piece onto their own GPU layer (translateZ / will-change: transform); once both
   are composited layers, z-index IS honored and the HUD stacks above the tower on iOS too. The
   canvas never intercepts pointer events (tower is clicked via the transparent #stage catcher). */
#scene { position: fixed; inset: 0; width: 100vw; height: 100vh; display: block;
  z-index: 0; pointer-events: none; transform: translateZ(0); }
/* #app is a passthrough — NO transform (it holds the run screen's position:fixed HUD children, and a
   transformed ancestor would become their containing block and collapse the layout). */
#app { position: relative; z-index: 1; }
/* menu/win/puddle render inside this FIXED, composited, scrollable layer. On iOS only a
   position:fixed + composited element paints above the WebGL canvas's auto-promoted layer (the badge
   and run HUD prove it); normal-flow content stays buried behind it. will-change:transform forces the
   GPU layer. CRITICAL: do NOT add -webkit-overflow-scrolling:touch — that paints the container BLANK
   over WebGL on iOS (PR#10's bug). Plain overflow-y:auto still momentum-scrolls on modern iOS. */
.screen-layer { position: fixed; inset: 0; z-index: 1; overflow-y: auto; will-change: transform; }
.screen-inner { max-width: 1100px; margin: 0 auto; padding: 12px; min-height: 100%; }
/* On the run screen each fixed HUD piece is its OWN composited layer, so iOS stacks it above the
   canvas WITHOUT any transformed ancestor breaking fixed positioning. */
#hud-stats, #sr-banner, #hud-readout, #hud-shop, #shop-fab, #pause-overlay, #meltvig {
  will-change: transform; }
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
#scene { height: 100dvh; } /* dvh keeps the 3D viewport under the iOS dynamic toolbars */

/* ---- Run-screen HUD (flat: every piece is a direct child of #app) ----
   IMPORTANT: cards are SOLID. Semi-transparent + backdrop-filter cards render blank on iOS Safari
   over the WebGL canvas, which previously stranded the whole overlay. */
#stage { position: fixed; z-index: 0; touch-action: manipulation; }
#meltvig { position: fixed; inset: 0; z-index: 1; pointer-events: none; opacity: 0; transition: opacity .3s ease;
  background: radial-gradient(130% 90% at 50% 32%, transparent 42%, rgba(180,90,20,.55) 100%); }
#meltvig.red { background: radial-gradient(130% 95% at 50% 28%, transparent 36%, rgba(150,15,12,.72) 100%); }
#meltvig.collapse { animation: meltpulse .5s ease-in-out infinite; }
@keyframes meltpulse { 0%,100% { opacity: .6 !important; } 50% { opacity: .9 !important; } }

.hud-card { background: #1d1a28; border: 1px solid var(--border); border-radius: 12px; padding: 10px 12px;
  box-shadow: 0 6px 24px rgba(0,0,0,.45); }
button { min-height: 40px; }
button.mini { min-height: 34px; padding: 4px 12px; }
button.primary { background: var(--accent); color: #0f2410; border-color: var(--accent); font-weight: bold; }

#hud-stats { position: fixed; z-index: 3; top: calc(10px + env(safe-area-inset-top)); left: 10px; min-width: 178px; }
#hud-stats .title { color: var(--goop); font-weight: bold; letter-spacing: 1px; }
#sr-banner { position: fixed; z-index: 3; top: calc(10px + env(safe-area-inset-top)); left: 50%;
  transform: translateX(-50%); max-width: 70vw; margin: 0; pointer-events: none; }
#hud-readout { position: fixed; z-index: 2; bottom: calc(14px + env(safe-area-inset-bottom)); text-align: center; pointer-events: none; }
#hud-readout .h { font-size: 32px; color: var(--goop); text-shadow: 0 2px 10px rgba(0,0,0,.85); }
#hud-readout .z { font-size: 15px; color: #fff; text-shadow: 0 1px 8px #000; }
#hud-readout .hint { font-size: 12px; color: #fff; opacity: .9; margin-top: 4px; text-shadow: 0 1px 8px #000; }
#hud-readout #sr-combo-label { color: #fff; font-size: 12px; text-shadow: 0 1px 6px #000; margin-top: 8px; }
#hud-readout .combo { width: min(360px, 72vw); margin: 4px auto 0; }

#hud-shop { position: fixed; z-index: 4; overflow-y: auto; overscroll-behavior: contain; -webkit-overflow-scrolling: touch; }
#shop-toggle { width: 100%; position: sticky; top: 0; }
#shop-body .panel { margin-bottom: 12px; }
#shop-fab { position: fixed; z-index: 4; display: none; }

#pause-overlay { position: fixed; inset: 0; z-index: 6; align-items: center; justify-content: center;
  background: rgba(8,6,14,.72); padding: 20px; }
#pause-overlay .pause-card { width: min(360px, 90vw); text-align: center; }

/* Landscape: shop docked right; stage = the clear left area. */
@media (orientation: landscape) {
  #stage { top: 0; left: 0; bottom: 0; right: 360px; }
  #hud-readout { left: 0; right: 360px; }
  #hud-shop { top: 0; right: 0; width: 340px; height: 100dvh; padding: 12px; border-radius: 0; }
  #hud-shop.collapsed { width: auto; height: auto; border-radius: 0 0 0 12px; }
  #hud-shop.collapsed #shop-body { display: none; }
  #shop-fab { display: none !important; }
}

/* Portrait: shop is a right side-drawer opened by a floating button; stage = the upper area. */
@media (orientation: portrait) {
  #hud-stats { left: 8px; right: 8px; min-width: 0; }
  #hud-stats .stat { display: inline-flex; gap: 6px; padding: 0; margin: 2px 12px 0 0; }
  #sr-banner { top: calc(118px + env(safe-area-inset-top)); max-width: 92vw; }
  #stage { top: 0; left: 0; right: 0; bottom: 22vh; }
  #hud-readout { left: 0; right: 0; }
  /* Drawer slide is driven by an inline transform in applyShopState() (JS) — see app.ts. */
  #hud-shop { top: 0; right: 0; bottom: 0; width: min(86vw, 330px); height: 100dvh;
    border-radius: 16px 0 0 16px; padding: 12px; transition: transform .25s ease; box-shadow: -14px 0 44px rgba(0,0,0,.55); }
  #shop-fab { display: block; right: 14px; bottom: calc(16px + env(safe-area-inset-bottom));
    border-radius: 24px; padding: 10px 18px; font-weight: bold; }
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

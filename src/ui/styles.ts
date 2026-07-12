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
/* WebGL canvas is shown ONLY on run/paused. On iOS a WebGL canvas composites above the DOM and no
   overlay reliably beats it, so on the normal-flow screens (menu/win/puddle) we hide it entirely and
   render plain scrolling DOM. data-screen is set on <body> in app.ts. */
#scene { position: fixed; inset: 0; width: 100vw; height: 100vh; display: none;
  z-index: 0; pointer-events: none; transform: translateZ(0); }
body[data-screen="run"] #scene, body[data-screen="paused"] #scene { display: block; }
/* menu/win/puddle: normal-flow container, page scrolls (canvas is hidden — no compositing needed). */
#app { position: relative; z-index: 1; max-width: 1100px; margin: 0 auto; padding: 12px; }
/* run/paused: #app becomes a FULL-VIEWPORT composited layer. This is the key to the iOS HUD: its
   position:fixed children (the HUD) composite ABOVE the WebGL canvas because their ancestor is a GPU
   layer — AND because #app is inset:0 with padding:0, its containing block == the viewport, so the
   fixed HUD keeps correct positioning (the earlier cramming happened only because #app was then a
   narrow max-width box). The badge proves a body-level fixed layer beats the canvas; this makes #app
   that layer for the whole HUD. */
body[data-screen="run"] #app, body[data-screen="paused"] #app {
  position: fixed; inset: 0; max-width: none; margin: 0; padding: 0; transform: translateZ(0); }
/* Extra safety: each fixed HUD piece is also its own composited layer. */
#hud-stats, #sr-banner, #hud-readout, #hud-shop, #shop-fab, #pause-overlay, #meltvig, #ach-overlay {
  will-change: transform; }
/* Mobile input hygiene: kill the gray tap-highlight flash, double-tap zoom on buttons, and stray
   text selection / long-press callouts during rapid tapping. Buttons + the whole run HUD are
   game chrome, not documents. (Pinch-zoom stays available on page-flow screens.) */
button, .shopitem, .hud-card, #stage, #hud-readout, #sr-banner {
  -webkit-tap-highlight-color: transparent; -webkit-touch-callout: none;
  user-select: none; -webkit-user-select: none; touch-action: manipulation; }
h1 { font-size: 28px; letter-spacing: 2px; margin: 8px 0; }
h2 { font-size: 16px; margin: 12px 0 6px; color: var(--muted); text-transform: uppercase; letter-spacing: 1px; }
button { font: inherit; cursor: pointer; background: var(--panel2); color: var(--ink);
  border: 1px solid var(--border); border-radius: 8px; padding: 8px 12px;
  transition: transform .06s ease, border-color .12s ease, filter .06s ease; }
button:hover:not(:disabled) { border-color: var(--accent); }
/* Mobile has no hover — a pressed button must LOOK pressed. */
button:active:not(:disabled) { transform: scale(.94); filter: brightness(1.25); }
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
button { min-height: 44px; min-width: 44px; } /* PLAN §9.2: tap targets ≥44px */
button.mini { min-height: 44px; padding: 4px 12px; }
button.primary { background: var(--accent); color: #0f2410; border-color: var(--accent); font-weight: bold; }
button.on { border-color: var(--goop); color: var(--goop); font-weight: bold; }
.buyamt { gap: 6px; margin-bottom: 8px; }
.buyamt .mini { min-width: 52px; }

/* Purchase feedback: bought rows flash green. */
.shopitem.bought { animation: boughtflash .45s ease-out; }
@keyframes boughtflash { 0% { background: #3a5a1e; border-color: var(--goop); } 100% { background: var(--panel2); } }

/* Floating "+N" gain readout at the tap point (spawned on <body>, above everything). */
.floater { position: fixed; z-index: 2147483000; pointer-events: none; color: var(--goop);
  font-weight: bold; font-size: 18px; text-shadow: 0 2px 8px rgba(0,0,0,.9);
  transform: translate(-50%, -100%); animation: floatup .7s ease-out forwards; will-change: transform, opacity; }
@keyframes floatup { 0% { opacity: 1; margin-top: 0; } 100% { opacity: 0; margin-top: -64px; } }

/* Zone transition toast: the run's biggest beat gets a big centred stamp. */
#zone-toast { position: fixed; z-index: 5; top: 30%; left: 50%; transform: translate(-50%, -50%);
  text-align: center; pointer-events: none; opacity: 0; will-change: transform, opacity; }
#zone-toast b { display: block; font-size: 40px; letter-spacing: 6px; color: var(--goop);
  text-shadow: 0 4px 24px rgba(0,0,0,.9); }
#zone-toast span { display: block; font-size: 18px; color: #fff; text-shadow: 0 2px 12px #000; }
#zone-toast.show { animation: zonetoast 2.4s ease-out forwards; }
@keyframes zonetoast {
  0% { opacity: 0; transform: translate(-50%, -30%) scale(.7); }
  12% { opacity: 1; transform: translate(-50%, -50%) scale(1.06); }
  20% { transform: translate(-50%, -50%) scale(1); }
  80% { opacity: 1; }
  100% { opacity: 0; transform: translate(-50%, -80%) scale(1); }
}

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
/* Nudge the closed drawer button when something in the shop is affordable. */
#shop-fab.attn { border-color: var(--goop); animation: fabpulse 1.2s ease-in-out infinite; }
@keyframes fabpulse { 0%,100% { box-shadow: 0 0 0 0 rgba(182,232,74,.55); } 55% { box-shadow: 0 0 0 12px rgba(182,232,74,0); } }

#pause-overlay { position: fixed; inset: 0; z-index: 6; align-items: center; justify-content: center;
  background: rgba(8,6,14,.72); padding: 20px; }
#pause-overlay .pause-card { width: min(360px, 90vw); text-align: center; }

/* Mid-run achievements overlay: opened over the live run (does NOT pause the sim). Solid bg (no
   backdrop-filter — see the iOS note at the top of this file), fixed direct child of #app, own GPU
   layer. z-index beats the shop drawer (4) and the pause overlay (6) so it's always reachable. */
#ach-overlay { position: fixed; inset: 0; z-index: 8; background: var(--bg);
  padding: 14px; padding-top: calc(14px + env(safe-area-inset-top));
  padding-bottom: calc(14px + env(safe-area-inset-bottom));
  overflow-y: auto; overscroll-behavior: contain; -webkit-overflow-scrolling: touch;
  touch-action: manipulation; }
#ach-overlay .ach-ov-head { position: sticky; top: 0; background: var(--bg); z-index: 1;
  display: flex; justify-content: space-between; align-items: center; gap: 10px;
  padding-bottom: 8px; margin-bottom: 4px; }
#ach-overlay .ach-ov-head h1 { font-size: 20px; letter-spacing: 1px; }

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
  #hud-stats { left: 8px; right: 8px; min-width: 0; padding: 8px 10px; }
  /* Slim stat bar: tighter type + gaps so Goop/GPS/Buffer fit one line at 390px. */
  #hud-stats .stat { display: inline-flex; gap: 5px; padding: 0; margin: 2px 10px 0 0; font-size: 13px; }
  #hud-stats .title { font-size: 14px; }
  #sr-banner { top: calc(112px + env(safe-area-inset-top)); max-width: 92vw; }
  #stage { top: 0; left: 0; right: 0; bottom: 22vh; }
  #hud-readout { left: 0; right: 0; }
  /* Drawer slide is driven by an inline transform in applyShopState() (JS) — see app.ts. */
  #hud-shop { top: 0; right: 0; bottom: 0; width: min(86vw, 330px); height: 100dvh;
    border-radius: 16px 0 0 16px; padding: 12px;
    padding-bottom: calc(12px + env(safe-area-inset-bottom)); padding-right: calc(12px + env(safe-area-inset-right));
    transition: transform .25s ease; box-shadow: -14px 0 44px rgba(0,0,0,.55); }
  /* Parked above the bottom hud-readout block (height/zone/combo/hint), not on top of it — the
     readout is full-width centered, so the FAB has to clear it vertically rather than horizontally. */
  #shop-fab { display: block; right: calc(14px + env(safe-area-inset-right));
    bottom: calc(22vh + 12px + env(safe-area-inset-bottom));
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
.shopitem .name .icon { display: inline-block; margin-right: 6px; font-size: 18px; }
.shopitem .flavor { color: var(--muted); font-size: 12px; }
.shopitem .cost { white-space: nowrap; color: var(--goop); font-variant-numeric: tabular-nums; }
.subtitle { margin: -2px 0 8px; }

/* ---- Achievements ---- */
.ach-grid { display: flex; flex-wrap: wrap; gap: 4px; }
.ach { width: 34px; height: 34px; display: inline-flex; align-items: center; justify-content: center;
  font-size: 18px; border: 1px solid var(--border); border-radius: 8px; background: var(--panel2);
  filter: grayscale(1) brightness(.45); cursor: pointer; }
.ach.on { filter: none; border-color: var(--goop); box-shadow: 0 0 6px rgba(182,232,74,.35); }
#ach-toast { position: fixed; z-index: 2147483100; top: calc(64px + env(safe-area-inset-top)); right: 10px;
  display: flex; gap: 10px; align-items: center; background: #1d1a28; border: 1px solid var(--goop);
  border-radius: 12px; padding: 8px 14px; box-shadow: 0 6px 24px rgba(0,0,0,.5), 0 0 14px rgba(182,232,74,.25);
  animation: achpop 2.8s ease forwards; will-change: transform, opacity; pointer-events: none; }
#ach-toast .i { font-size: 26px; }
#ach-toast .t { font-size: 13px; line-height: 1.25; }
#ach-toast .t b { color: var(--goop); display: block; }
#ach-toast .t i { display: block; font-style: normal; color: var(--muted); font-size: 11px; }
@keyframes achpop {
  0% { opacity: 0; transform: translateX(40px); }
  8% { opacity: 1; transform: translateX(0); }
  85% { opacity: 1; }
  100% { opacity: 0; transform: translateY(-16px); }
}
.combo { height: 10px; background: var(--panel2); border-radius: 6px; overflow: hidden; border: 1px solid var(--border); }
.combo > i { display: block; height: 100%; background: linear-gradient(90deg, var(--goop), var(--accent)); }
.combo.maxed { border-color: var(--goop); box-shadow: 0 0 12px rgba(182,232,74,.7); }
.combo.maxed > i { animation: comboglow .5s ease-in-out infinite alternate; }
@keyframes comboglow { from { filter: brightness(1); } to { filter: brightness(1.5); } }
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

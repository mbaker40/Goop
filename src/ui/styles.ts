/**
 * styles.ts - M0 "playable ugly" DOM styling (PLAN §17 M0: ugly before goopy).
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
   ABOVE any plain (non-composited) DOM regardless of z-index - that's what stranded the whole
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
/* menu/win/puddle: normal-flow container, page scrolls (canvas is hidden - no compositing needed). */
#app { position: relative; z-index: 1; max-width: 1100px; margin: 0 auto; padding: 12px; }
/* run/paused: #app becomes a FULL-VIEWPORT composited layer. This is the key to the iOS HUD: its
   position:fixed children (the HUD) composite ABOVE the WebGL canvas because their ancestor is a GPU
   layer - AND because #app is inset:0 with padding:0, its containing block == the viewport, so the
   fixed HUD keeps correct positioning (the earlier cramming happened only because #app was then a
   narrow max-width box). The badge proves a body-level fixed layer beats the canvas; this makes #app
   that layer for the whole HUD. */
body[data-screen="run"] #app, body[data-screen="paused"] #app {
  position: fixed; inset: 0; max-width: none; margin: 0; padding: 0; transform: translateZ(0); }
/* Extra safety: each fixed HUD piece is also its own composited layer. */
#hud-stats, #hud-readout, #hud-shop, #shop-fab, #pause-overlay, #meltvig, #ach-overlay,
#event-banner, #event-chips, .event-tgt {
  will-change: transform; }
/* Mobile input hygiene: kill the gray tap-highlight flash, double-tap zoom on buttons, and stray
   text selection / long-press callouts during rapid tapping. Buttons + the whole run HUD are
   game chrome, not documents. (Pinch-zoom stays available on page-flow screens.) */
button, .shopitem, .hud-card, #stage, #hud-readout {
  -webkit-tap-highlight-color: transparent; -webkit-touch-callout: none;
  user-select: none; -webkit-user-select: none; touch-action: manipulation; }
h1 { font-size: 28px; letter-spacing: 2px; margin: 8px 0; }
h2 { font-size: 16px; margin: 12px 0 6px; color: var(--muted); text-transform: uppercase; letter-spacing: 1px; }
button { font: inherit; cursor: pointer; background: var(--panel2); color: var(--ink);
  border: 1px solid var(--border); border-radius: 8px; padding: 8px 12px;
  transition: transform .06s ease, border-color .12s ease, filter .06s ease; }
button:hover:not(:disabled) { border-color: var(--accent); }
/* Mobile has no hover - a pressed button must LOOK pressed. */
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

/* ---- Chaos events (PLAN §8) ---- */
#event-banner { position: fixed; z-index: 4; top: calc(64px + env(safe-area-inset-top)); left: 50%;
  transform: translateX(-50%); width: min(420px, 92vw); text-align: center;
  background: #241d33; border: 1px solid #6a4fd0; border-radius: 12px; padding: 8px 12px;
  box-shadow: 0 6px 24px rgba(60,20,140,.5); animation: eventpop .35s ease-out; }
@keyframes eventpop { 0% { opacity: 0; transform: translateX(-50%) scale(.8); } 100% { opacity: 1; transform: translateX(-50%) scale(1); } }
#event-banner .en { font-weight: bold; color: #c9b2ff; letter-spacing: .5px; }
#event-banner .ef { font-size: 12px; color: #cfc8e2; margin-top: 2px; }
#event-banner .et { font-size: 12px; color: #8f86ab; margin-top: 2px; font-variant-numeric: tabular-nums; }
#event-banner .row { justify-content: center; gap: 8px; margin-top: 6px; }
#event-banner button.deal { background: var(--accent); color: #0f2410; font-weight: bold; }
.event-tgt { position: fixed; z-index: 4; width: 56px; height: 56px; border-radius: 50%;
  border: 2px solid #ffd96a; background: radial-gradient(circle at 35% 30%, #fff3c4, #f0b429 70%);
  display: inline-flex; align-items: center; justify-content: center; line-height: 1;
  box-shadow: 0 4px 18px rgba(255,200,60,.55);
  transform: translate(-50%, -50%); animation: tgtbob 1.1s ease-in-out infinite; touch-action: manipulation; }
.event-tgt svg { width: 30px; height: 30px; display: block; }
@keyframes tgtbob { 0%,100% { margin-top: 0; } 50% { margin-top: -8px; } }
/* Centered under the melt banner (the top corners belong to the stat cards). While an event
   banner is up it covers this spot for its ~1s linger - acceptable, chips run for 20-90s. */
#event-chips { position: fixed; z-index: 3; top: calc(64px + env(safe-area-inset-top)); left: 50%;
  transform: translateX(-50%); display: flex; flex-direction: row; flex-wrap: wrap; gap: 4px;
  justify-content: center; max-width: 92vw; pointer-events: none; }
#event-chips .chip { background: #241d33; border: 1px solid var(--border); border-radius: 999px;
  padding: 3px 10px; font-size: 12px; color: #e6ddff; white-space: nowrap; font-variant-numeric: tabular-nums; }
#event-toast { position: fixed; z-index: 2147483000; left: 50%; bottom: calc(120px + env(safe-area-inset-bottom));
  transform: translateX(-50%); background: #241d33; border: 1px solid #6a4fd0; border-radius: 10px;
  color: #e6ddff; padding: 8px 14px; font-size: 13px; max-width: 92vw; text-align: center;
  pointer-events: none; animation: eventtoast 2.6s ease-out forwards; }
@keyframes eventtoast { 0% { opacity: 0; margin-bottom: -12px; } 10% { opacity: 1; margin-bottom: 0; }
  80% { opacity: 1; } 100% { opacity: 0; margin-bottom: 18px; } }

/* ---- Tutorial: the Judgmental Toaster ---- */
#tut-card, #tut-cameo { position: fixed; z-index: 6; left: 10px; bottom: calc(96px + env(safe-area-inset-bottom));
  display: flex; align-items: flex-end; gap: 8px; max-width: min(430px, 94vw);
  animation: tutin .4s ease-out; will-change: transform; }
@keyframes tutin { 0% { opacity: 0; transform: translateY(24px); } 100% { opacity: 1; transform: none; } }
.tut-portrait { width: 84px; height: 84px; background: #1d1a28; border: 2px solid #6a4fd0;
  border-radius: 14px; flex: 0 0 auto; animation: tutbob 2.2s ease-in-out infinite; }
@keyframes tutbob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
.tut-bubble { background: #efe9dc; color: #23202e; border-radius: 14px 14px 14px 4px;
  padding: 10px 14px; font-size: 14px; line-height: 1.45; min-width: 150px; min-height: 42px;
  border: 2px solid #b8ac94; cursor: pointer; }
.tut-skip { position: absolute; right: 0; top: -40px; opacity: .75; font-size: 12px; }
#boss-meter { position: fixed; z-index: 4; top: calc(64px + env(safe-area-inset-top)); left: 50%;
  transform: translateX(-50%); width: min(400px, 88vw); text-align: center;
  background: #2a1420; border: 1px solid #d94a6a; border-radius: 12px; padding: 8px 12px;
  box-shadow: 0 6px 24px rgba(180,30,60,.5); will-change: transform; }
#boss-meter b { color: #ff9ab0; letter-spacing: 2px; font-size: 13px; }
#boss-meter .track { height: 10px; background: #1a0c12; border-radius: 999px; margin-top: 6px; overflow: hidden; }
#boss-meter .track i { display: block; height: 100%; width: 0%; background: linear-gradient(90deg, #d94a6a, #ffb03a);
  border-radius: 999px; transition: width .2s linear; }
#tut-pointer { position: fixed; z-index: 5; pointer-events: none; border: 3px solid var(--goop);
  border-radius: 50%; animation: tutping 1.3s ease-out infinite; will-change: transform, opacity; }
@keyframes tutping { 0% { transform: scale(.75); opacity: .95; } 80% { transform: scale(1.12); opacity: .15; }
  100% { transform: scale(1.15); opacity: 0; } }

#hud-stats { position: fixed; z-index: 3; top: calc(10px + env(safe-area-inset-top)); left: 10px; min-width: 178px;
  transition: border-color .3s ease; }
#hud-stats .title { color: var(--goop); font-weight: bold; letter-spacing: 1px; }
/* The stats card carries melt status directly (the old separate melt banner said the same thing). */
#hud-stats[data-melt="safe"] #sr-buffer { color: var(--accent); }
#hud-stats[data-melt="warm"] { border-color: var(--warn); }
#hud-stats[data-melt="warm"] #sr-buffer { color: var(--warn); }
#hud-stats[data-melt="hot"] { border-color: var(--danger); animation: pulse .7s infinite; }
#hud-stats[data-melt="hot"] #sr-buffer { color: var(--danger); font-weight: bold; }
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
   backdrop-filter - see the iOS note at the top of this file), fixed direct child of #app, own GPU
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
  #stage { top: 0; left: 0; right: 0; bottom: 22vh; }
  #hud-readout { left: 0; right: 0; }
  /* Drawer slide is driven by an inline transform in applyShopState() (JS) - see app.ts. */
  #hud-shop { top: 0; right: 0; bottom: 0; width: min(86vw, 330px); height: 100dvh;
    border-radius: 16px 0 0 16px; padding: 12px;
    padding-bottom: calc(12px + env(safe-area-inset-bottom)); padding-right: calc(12px + env(safe-area-inset-right));
    transition: transform .25s ease; box-shadow: -14px 0 44px rgba(0,0,0,.55); }
  /* Parked above the bottom hud-readout block (height/zone/combo/hint), not on top of it - the
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
.shopitem .name .icon { display: inline-flex; vertical-align: -4px; margin-right: 6px; }
.shopitem .name .icon svg { width: 18px; height: 18px; }
.shopitem .flavor { color: var(--muted); font-size: 12px; }
.shopitem .cost { white-space: nowrap; color: var(--goop); font-variant-numeric: tabular-nums; }
.subtitle { margin: -2px 0 8px; }

/* ---- Achievements (handmade SVG tiles; see ui/icons.ts) ---- */
.ach-grid { display: flex; flex-wrap: wrap; gap: 4px; }
.ach { position: relative; width: 36px; height: 36px; display: inline-flex; align-items: center;
  justify-content: center; border: 1px solid var(--border); border-radius: 8px; background: var(--panel2);
  filter: grayscale(1) brightness(.45); cursor: pointer; }
.ach svg { width: 23px; height: 23px; display: block; }
.ach.on { filter: none; border-color: var(--goop); box-shadow: 0 0 6px rgba(182,232,74,.35); }
/* Tier pips: tiny dots along the tile bottom (I..VI within a family). */
.ach .pips { position: absolute; bottom: 2px; left: 0; right: 0; display: flex; gap: 2px;
  justify-content: center; pointer-events: none; }
.ach .pips b { width: 3px; height: 3px; border-radius: 50%; background: var(--goop); display: block; }
.ach:not(.on) .pips b { background: var(--muted); }
#ach-detail .dico { display: inline-block; vertical-align: -4px; margin-right: 6px; }
#ach-detail .dico svg { width: 18px; height: 18px; }
#ach-toast .i svg { width: 28px; height: 28px; display: block; }
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

/* Inline SVG icons in text flow (buttons, stat labels, headers) - see ui/icons.ts ic(). */
.ic { display: inline-flex; vertical-align: -0.12em; }
.ic svg { width: 1em; height: 1em; }

/* ---- Main menu: hero + folding sections (keep it calm) ---- */
.menu-hero { text-align: center; max-width: 520px; margin: 4vh auto 18px; }
.menu-hero h1 { margin-bottom: 2px; }
#menu-start { width: 100%; font-size: 20px; padding: 16px; margin-top: 14px; }
.menu-vitals { display: flex; justify-content: center; gap: 18px; margin-top: 12px; color: var(--muted);
  font-size: 14px; flex-wrap: wrap; }
.menu-vitals b { color: var(--goop); }
.msec { max-width: 520px; margin: 0 auto 10px; border: 1px solid var(--border); border-radius: 12px;
  background: var(--panel); overflow: hidden; }
.msec-head { width: 100%; display: flex; align-items: center; gap: 10px; border: none; border-radius: 0;
  background: none; padding: 14px 14px; font-weight: bold; text-align: left; }
.msec-head span:first-child { flex: 1; }
.msec-head i { font-style: normal; color: var(--muted); }
.msec.open .msec-head { border-bottom: 1px solid var(--border); }
.msec-body { padding: 12px; }
.msec:not(.open) .msec-body { display: none; }
textarea { width: 100%; height: 70px; background: var(--panel2); color: var(--ink); border: 1px solid var(--border); border-radius: 8px; }
`;

export function injectStyles(): void {
  const el = document.createElement('style');
  el.textContent = CSS;
  document.head.appendChild(el);
}

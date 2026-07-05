/**
 * main.ts — boot: load save -> Store -> UI -> 3D renderer -> loop -> autosave (PLAN §10).
 */

import { injectStyles } from './ui/styles';
import { GoopUI } from './ui/app';
import { GoopRenderer } from './render';
import { MockSource } from './render/mockState';
import { Store, defaultSettings } from './store';
import {
  loadSave,
  writeSave,
  buildSave,
  applyOfflineProgress,
} from './save';
import { deserializeRun } from './save';
import { createMetaState } from './sim/game';

declare global {
  interface Window {
    __goopStore?: Store;
  }
}

/** Injected at build time by Vite (see vite.config.ts). Short git SHA + build time. */
declare const __BUILD_ID__: string;

/** Always-on build stamp so a cached bundle is obvious. Lives on <body>, NOT #app, so no screen
 * render can wipe it; fixed + will-change so it composites above the WebGL canvas on iOS. */
function injectBuildBadge(): void {
  const badge = document.createElement('div');
  badge.id = 'build-badge';
  badge.textContent = `build ${typeof __BUILD_ID__ === 'string' ? __BUILD_ID__ : 'dev'}`;
  document.body.appendChild(badge);
}

function boot(): void {
  injectStyles();
  injectBuildBadge();

  const saved = loadSave();
  const meta = saved?.meta ?? createMetaState();
  const settings = saved?.settings ?? defaultSettings();
  const store = new Store(meta, settings);

  // Restore an in-progress run if the save had one (PLAN §12), crediting capped offline GPS.
  if (saved?.run) {
    try {
      const run = deserializeRun(saved.run);
      store.game.run = run;
      if (run.status === 'active' || run.status === 'grace') {
        const offline = applyOfflineProgress(store.game.gps(), saved.savedAt, Date.now());
        if (offline.goopGained.gt(0)) {
          run.goop = run.goop.add(offline.goopGained);
          run.lifetimeGoop = run.lifetimeGoop.add(offline.goopGained);
        }
        store.screen = 'run';
      }
    } catch {
      /* corrupt run — fall back to menu with meta intact */
    }
  }

  const mount = document.getElementById('app');
  if (!mount) throw new Error('#app mount missing');
  new GoopUI(store, mount);

  // Dev-only handle for smoke tests (e.g. forcing a collapse); only under ?debug.
  if (location.search.includes('debug')) window.__goopStore = store;

  // 3D renderer behind the DOM overlay. `?mockrender` drives it from a scripted fixture instead
  // of the live sim, for isolated visual testing (PLAN §16.2).
  const canvas = document.getElementById('scene') as HTMLCanvasElement | null;
  if (canvas) {
    if (location.search.includes('mockrender')) {
      const mock = new MockSource();
      mock.start();
      new GoopRenderer(canvas, mock).start();
    } else {
      // Frame the 3D tower into the run-screen stage element so it lines up with the HUD.
      const stageRect = (): DOMRect | null => {
        if (store.screen !== 'run' && store.screen !== 'paused') return null;
        return document.getElementById('stage')?.getBoundingClientRect() ?? null;
      };
      new GoopRenderer(canvas, store, stageRect).start();
    }
  }

  store.start();

  // Autosave every 15s and on tab hide (PLAN §12).
  const persist = () => {
    const runActive = store.screen === 'run' && (store.game.run.status === 'active' || store.game.run.status === 'grace');
    writeSave(buildSave(store.meta, store.game.run, store.settings, runActive));
  };
  setInterval(persist, 15_000);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') persist();
  });
  window.addEventListener('beforeunload', persist);
}

boot();

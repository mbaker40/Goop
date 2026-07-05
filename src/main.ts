/**
 * main.ts — boot: load save -> Store -> UI -> loop -> autosave (PLAN §10).
 * M0 has no 3D; the renderer wires in here in Milestone 1.
 */

import { injectStyles } from './ui/styles';
import { GoopUI } from './ui/app';
import { Store, defaultSettings } from './store';
import {
  loadSave,
  writeSave,
  buildSave,
  applyOfflineProgress,
} from './save';
import { deserializeRun } from './save';
import { createMetaState } from './sim/game';

function boot(): void {
  injectStyles();

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

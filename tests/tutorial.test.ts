/**
 * Tutorial config sanity + save migration: predicates must be reachable by actual play, and
 * accounts that predate the tutorial must never see it.
 */

import { describe, it, expect } from 'vitest';
import { Game, createMetaState } from '../src/sim/game';
import { TUTORIAL_STEPS } from '../src/config/tutorial';
import { balance } from '../src/config/balance';

describe('tutorial (config/tutorial.ts)', () => {
  it('steps are unique and every reveal id is a string', () => {
    const ids = new Set(TUTORIAL_STEPS.map((s) => s.id));
    expect(ids.size).toBe(TUTORIAL_STEPS.length);
    for (const s of TUTORIAL_STEPS) {
      expect(s.lines.length).toBeGreaterThan(0);
      for (const r of s.reveal) expect(typeof r).toBe('string');
    }
  });

  it('goals are reachable in order by ordinary play', () => {
    const g = new Game(createMetaState(), 5);
    const dt = 1 / balance.tickHz;
    let step = 0;
    // Drive the game like a brand-new player: tap, buy the first dripper when affordable.
    for (let i = 0; i < Math.round(240 / dt) && step < TUTORIAL_STEPS.length; i++) {
      g.click();
      if ((g.run.producersOwned['dripper'] ?? 0) < 1 && g.canAfford(g.producerCost('dripper', 1))) {
        g.buyProducer('dripper', 1);
      }
      g.tick(dt);
      while (step < TUTORIAL_STEPS.length && TUTORIAL_STEPS[step]!.goal(g)) step++;
    }
    expect(step).toBe(TUTORIAL_STEPS.length);
  });

  it('goal predicates never mutate the game', () => {
    const g = new Game(createMetaState(), 6);
    for (let i = 0; i < 50; i++) g.click();
    const before = JSON.stringify({ goop: g.run.goop.toString(), clicks: g.run.clicks, combo: g.run.combo });
    for (const s of TUTORIAL_STEPS) s.goal(g);
    const after = JSON.stringify({ goop: g.run.goop.toString(), clicks: g.run.clicks, combo: g.run.combo });
    expect(after).toBe(before);
  });

  it('legacy saves (recorded play, no tutorialStep) migrate straight past the tutorial', async () => {
    const { loadSave } = await import('../src/save/index');
    const legacyMeta = { ...createMetaState(), totalClicks: 1234 } as Record<string, unknown>;
    delete legacyMeta['tutorialStep'];
    delete legacyMeta['puddleTipShown'];
    // Node has no localStorage; a Map-backed shim is all loadSave needs.
    const mem = new Map<string, string>();
    (globalThis as { localStorage?: unknown }).localStorage = {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => void mem.set(k, v),
      removeItem: (k: string) => void mem.delete(k),
    };
    const { SAVE_VERSION } = await import('../src/save/index');
    const key = `goopTower.save.v${SAVE_VERSION}`;
    localStorage.setItem(
      key,
      JSON.stringify({ version: 1, savedAt: Date.now(), runActive: false, run: null, meta: legacyMeta, settings: {} }),
    );
    const loaded = loadSave();
    expect(loaded).not.toBeNull();
    expect(loaded!.meta.tutorialStep).toBeGreaterThanOrEqual(TUTORIAL_STEPS.length);
    expect(loaded!.meta.puddleTipShown).toBe(true);
    localStorage.removeItem(key);
  });

  it('fresh accounts start at step 0', () => {
    expect(createMetaState().tutorialStep).toBe(0);
    expect(createMetaState().puddleTipShown).toBe(false);
  });
});

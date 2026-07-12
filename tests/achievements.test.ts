/**
 * achievements.test.ts - the 100-achievement system (PLAN §7).
 * Config sanity (exactly 100, unique ids - Steam's per-app cap), unlock mechanics,
 * the +0.5%/unlock GPS bonus, and save-migration defaults for older saves.
 */

import { describe, it, expect } from 'vitest';
import { ACHIEVEMENTS } from '../src/config/achievements';
import { balance } from '../src/config/balance';
import { Game, createMetaState } from '../src/sim/game';
import { checkAchievements } from '../src/sim/achievements';
import { bankRun } from '../src/sim/prestige';

describe('achievements config', () => {
  it('has exactly 100 achievements (the Steam per-app cap) with unique ids', () => {
    expect(ACHIEVEMENTS.length).toBe(100);
    const ids = new Set(ACHIEVEMENTS.map((a) => a.id));
    expect(ids.size).toBe(100);
  });

  it('every achievement has a name, icon and flavor', () => {
    for (const a of ACHIEVEMENTS) {
      expect(a.name.length).toBeGreaterThan(2);
      expect(a.icon.length).toBeGreaterThan(0);
      expect(a.flavor.length).toBeGreaterThan(5);
    }
  });
});

describe('achievement unlocking', () => {
  it('First Splat unlocks on the first click', () => {
    const game = new Game(createMetaState(), 1);
    game.run.status = 'active';
    expect(game.meta.achievements).toHaveLength(0);
    game.click();
    const fresh = checkAchievements(game);
    expect(fresh).toContain('click1');
    expect(game.meta.achievements).toContain('click1');
    // Re-checking never double-unlocks.
    expect(checkAchievements(game)).toHaveLength(0);
  });

  it('producer-ownership achievements unlock at their thresholds', () => {
    const game = new Game(createMetaState(), 1);
    game.run.producersOwned['dripper'] = 50;
    const fresh = checkAchievements(game);
    expect(fresh).toContain('own_dripper_1');
    expect(fresh).toContain('own_dripper_50');
    expect(fresh).not.toContain('own_dripper_100');
  });

  it('each unlock grants the configured goop/sec bonus', () => {
    const game = new Game(createMetaState(), 1);
    const before = game.globalGpsMult();
    game.meta.achievements.push('click1', 'click100');
    const after = game.globalGpsMult();
    expect(after / before).toBeCloseTo(1 + 2 * balance.achievements.gpsPctEach, 10);
  });

  it('bankRun tracks puddles and lifetime GE for achievement conditions', () => {
    const meta = createMetaState();
    bankRun(meta, 20, false); // a decent failed run
    expect(meta.puddles).toBe(1);
    expect(meta.lifetimeGe).toBe(meta.ge);
    const spent = meta.ge;
    meta.ge = 0; // spending never reduces lifetimeGe
    expect(meta.lifetimeGe).toBe(spent);
  });

  it('death-conditioned achievements fire when the collapse begins', () => {
    const game = new Game(createMetaState(), 1);
    game.run.status = 'active';
    game.run.runTime = 100; // past nothing; still zone 1
    // Force a collapse by draining the shield with melt: simulate directly.
    game.run.status = 'collapsing';
    const fresh = checkAchievements(game);
    expect(fresh).toContain('kitchenmelt'); // melted without leaving Zone 1
  });
});

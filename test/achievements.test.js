import { describe, it, expect } from 'vitest';
import { BADGES, checkBadges } from '../src/achievements.js';
import { newState } from '../src/econ.js';
import { newStats, recordStage, recordEvent, newRun } from '../src/stats.js';
import { createLocalAchievements } from '../src/platform/achievements.js';

describe('achievements', () => {
  it('about thirty, unique ids, each with a name and a blurb', () => {
    expect(BADGES.length).toBeGreaterThanOrEqual(25); expect(BADGES.length).toBeLessThanOrEqual(40);
    expect(new Set(BADGES.map(b => b.id)).size).toBe(BADGES.length);
    for (const b of BADGES) { expect(b.name).toBeTruthy(); expect(b.blurb).toMatch(/\.$/); }
  });
  it('a fresh game has earned nothing', () => {
    expect(checkBadges(newState(), newStats(), () => false)).toEqual([]);
  });
  it('1,000 feeds, ten catches in a row, an inspector, a hop', () => {
    const s = newState(), st = newStats();
    st.feeds = 1000;
    for (let i = 0; i < 10; i++) recordEvent(st, 'geyser', true);
    recordEvent(st, 'inspector', true);
    st.hops = 1;
    const got = checkBadges(s, st, () => false);
    for (const id of ['feed1', 'feed100', 'feed1k', 'streak10', 'event1', 'inspector', 'hop1']) expect(got).toContain(id);
    expect(got).not.toContain('feed10k');
  });
  it('Jupiter without interns', () => {
    const s = newState(), st = newStats(); s.stage = 5; s.own[0] = 50;
    expect(checkBadges(s, st, () => false)).toContain('nointerns');
    s.own[1] = 1;
    expect(checkBadges(s, st, () => false)).not.toContain('nointerns');
  });
  it('the local adapter records each badge once', () => {
    const a = createLocalAchievements();
    expect(a.unlock('feed1')).toBe(true); expect(a.unlock('feed1')).toBe(false);
    expect(a.has('feed1')).toBe(true); expect(a.count()).toBe(1);
  });
});

describe('stats', () => {
  it('stage times: per run and the best ever', () => {
    const st = newStats();
    recordStage(st, 1, 100); recordStage(st, 1, 50);          // only the first time in a run counts
    expect(st.runStageAt[1]).toBe(100); expect(st.bestStageAt[1]).toBe(100);
    newRun(st); recordStage(st, 1, 80);
    expect(st.bestStageAt[1]).toBe(80);
    newRun(st); recordStage(st, 1, 120);
    expect(st.bestStageAt[1]).toBe(80);
  });
  it('a missed event breaks the streak', () => {
    const st = newStats();
    recordEvent(st, 'frenzy', true); recordEvent(st, 'frenzy', true); recordEvent(st, 'drip', false); recordEvent(st, 'frenzy', true);
    expect(st.streak).toBe(1); expect(st.bestStreak).toBe(2);
    expect(st.caught.frenzy).toBe(3); expect(st.missed.drip).toBe(1);
  });
});

import { describe, it, expect } from 'vitest';
import { BADGES, checkBadges } from '../src/achievements.js';
import { newState } from '../src/econ.js';
import { newStats, recordStage, recordEvent, recordFeed, newRun } from '../src/stats.js';
import { createLocalAchievements } from '../src/platform/achievements.js';

describe('achievements', () => {
  it('fifty to sixty, unique ids, each with a name and a blurb', () => {
    expect(BADGES.length).toBeGreaterThanOrEqual(50); expect(BADGES.length).toBeLessThanOrEqual(60);
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
  it('Act 2: stages, the sound toggle, the universe, the ending and moods', () => {
    const s = newState(), st = newStats();
    s.stage = 19; s.miles = { 'w-sound': true };
    st.universes = 1; st.cutsceneSeen = 1; st.bigBangs = 1; st.milestones = 50;
    for (const m of ['frozen', 'delighted', 'stuffed', 'smug', 'sleepy', 'hungry']) st.moods[m] = 1;
    const got = checkBadges(s, st, () => false);
    for (const id of ['stage8', 'stage9', 'stage11', 'stage14', 'toaster', 'oldfriend', 'stage20', 'soundtoggle', 'universe', 'watched', 'bigbang', 'mile1', 'mile50', 'hungry', 'smug', 'moodring']) expect(got).toContain(id);
    expect(got).not.toContain('rewatch');
    delete st.moods.frozen;
    expect(checkBadges(s, st, () => false)).not.toContain('moodring');
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
  it('feeds past the click cap count for nothing, so they cannot farm the feed badges', () => {
    const st = newStats();
    for (let i = 0; i < 2000; i++) recordFeed(st, i < 600);
    expect(st.feeds).toBe(600); expect(st.paidClicks).toBe(600); expect(st.cappedClicks).toBe(1400);
    const got = checkBadges(newState(), st, () => false);
    expect(got).toContain('feed100'); expect(got).toContain('capped'); expect(got).not.toContain('feed1k');
  });
  it('a missed event breaks the streak', () => {
    const st = newStats();
    recordEvent(st, 'frenzy', true); recordEvent(st, 'frenzy', true); recordEvent(st, 'drip', false); recordEvent(st, 'frenzy', true);
    expect(st.streak).toBe(1); expect(st.bestStreak).toBe(2);
    expect(st.caught.frenzy).toBe(3); expect(st.missed.drip).toBe(1);
  });
});

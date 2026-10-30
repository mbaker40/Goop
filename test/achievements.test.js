import { describe, it, expect } from 'vitest';
import { BADGES, checkBadges } from '../src/achievements.js';
import { newState } from '../src/econ.js';
import { newStats, recordStage, recordEvent, recordFeed, newRun } from '../src/stats.js';
import { createLocalAchievements } from '../src/platform/achievements.js';

describe('achievements', () => {
  it('about eighty, plus the feeder legends; unique ids, each with a name and a blurb', () => {
    expect(BADGES.filter(b => b.group !== 'legends').length).toBeGreaterThanOrEqual(78); expect(BADGES.filter(b => b.group !== 'legends').length).toBeLessThanOrEqual(90);
    expect(BADGES.length).toBeLessThanOrEqual(140);
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

import { BADGE_GROUPS, badgesIn } from '../src/achievements.js';
import { FEEDERS } from '../src/econ.js';
import { flag, recordGamble, recordVisitor, cleanRun } from '../src/stats.js';

describe('phase 4 badges', () => {
  const got = (s, st) => checkBadges(s, st, () => false);
  it('every badge sits in exactly one shelf group, and no group is empty', () => {
    for (const b of BADGES) expect(BADGE_GROUPS.map(g => g.id)).toContain(b.group);
    for (const g of BADGE_GROUPS) expect(badgesIn(g.id).length).toBeGreaterThan(0);
    expect(BADGE_GROUPS.reduce((n, g) => n + badgesIn(g.id).length, 0)).toBe(BADGES.length);
  });
  it('the flags the game sets each earn their badge', () => {
    const st = newStats();
    for (const [f, id] of [['cleanRun', 'nomiss'], ['muteEat', 'mutesound'], ['dailyHands', 'handsdaily'], ['zeroHop', 'zerohop'], ['duelWin', 'duelwin'], ['duelLose', 'duellose'], ['deepHop', 'deephop'], ['pity', 'pity'], ['night', 'nightowl']]) {
      expect(got(newState(), st)).not.toContain(id); flag(st, f); expect(got(newState(), st)).toContain(id);
    }
  });
  it('five gambles in a row; a loss resets the streak', () => {
    const st = newStats();
    for (let i = 0; i < 4; i++) recordGamble(st, true); recordGamble(st, false); recordGamble(st, true);
    expect(got(newState(), st)).not.toContain('gamble5');
    for (let i = 0; i < 4; i++) recordGamble(st, true);
    expect(st.bestGambleStreak).toBe(5); expect(got(newState(), st)).toContain('gamble5');
  });
  it('a clean run needs three visitors or more, all shooed', () => {
    const st = newStats(); recordVisitor(st, true); recordVisitor(st, true); expect(cleanRun(st)).toBe(false);
    recordVisitor(st, true); expect(cleanRun(st)).toBe(true); recordVisitor(st, false); expect(cleanRun(st)).toBe(false);
    newRun(st); expect(st.runHazards).toBe(0);
  });
  it('the Sun without a Mutation, Downtown without a hand, and a +100% hop bonus', () => {
    const s = newState(), st = newStats(); s.stage = 6;
    expect(got(s, st)).toContain('nomut'); s.ups.mut1 = true; expect(got(s, st)).not.toContain('nomut');
    const t = newState(); t.stage = 2; expect(got(t, st)).toContain('nofeed'); t.feeds = 1; expect(got(t, st)).not.toContain('nofeed');
    const u = newState(); u.hopBonus = 1; expect(got(u, st)).toContain('bonus100');
  });
  it('feeder legends: a badge at 100 and at 500 for each feeder, any 500, and 100 of every feeder in an act', () => {
    const s = newState(), st = newStats(); s.own[1] = 100;
    expect(got(s, st)).toContain('leg1-intern'); expect(got(s, st)).not.toContain('leg2-intern');
    s.own[1] = 500; expect(got(s, st)).toEqual(expect.arrayContaining(['leg2-intern', 'leg500any']));
    expect(got(s, st)).not.toContain('leg100act');
    FEEDERS.forEach((f, i) => { if (f.stage < 6) s.own[i] = Math.max(s.own[i], 100); });
    expect(got(s, st)).toContain('leg100act');
    expect(BADGES.filter(b => b.id.startsWith('leg1-')).length).toBe(FEEDERS.length);
  });
});

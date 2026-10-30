import { describe, it, expect } from 'vitest';
import { shareModel, furthestStage, shareFileName, GAME_URL } from '../src/share.js';
import { newState, LAST } from '../src/econ.js';
import { newStats, SUN, UNIVERSE } from '../src/stats.js';
import { BADGES } from '../src/achievements.js';

describe('the share card model', () => {
  it('the avatar is the goop at its furthest stage, not where this run is', () => {
    const s = newState(), st = newStats(); s.stage = 2; st.bestStageAt[9] = 4000;
    expect(furthestStage(s, st)).toEqual({ stage: 9, universe: false });
    st.universes = 1;
    expect(furthestStage(s, st)).toEqual({ stage: LAST, universe: true });
  });
  it('says the name, the Sun time, the universe time if reached, hops and badges', () => {
    const s = newState(), st = newStats(); st.bestStageAt[SUN] = 725; st.hops = 4;
    const badges = { feed1: 10, sun: 30, hop1: 20 };
    const m = shareModel({ state: s, stats: st, badges, name: 'Dr. Ooze' });
    expect(m.name).toBe('Dr. Ooze'); expect(m.url).toBe(GAME_URL);
    expect(m.rows).toEqual([['Time to the Sun', '12 min 5 s'], ['Hops', '4'], ['Badges', '3 of ' + BADGES.length]]);
    expect(m.badges).toEqual(['sun', 'hop1', 'feed1']);                       // newest first
    expect(m.text).toContain('ate the Sun in 12 min 5 s'); expect(m.text).toContain(GAME_URL);
    st.bestStageAt[UNIVERSE] = 3 * 3600; st.universes = 1; st.bigBangs = 2;
    const u = shareModel({ state: s, stats: st, badges, name: 'Dr. Ooze' });
    expect(u.title).toBe('Ate the universe');
    expect(u.rows.map(r => r[0])).toEqual(['Time to the Sun', 'Time to the universe', 'Hops', 'Big Bangs', 'Badges']);
  });
  it('a fresh goop shares too, and badge rows are capped with a count of the rest', () => {
    const m = shareModel({ state: newState(), stats: newStats(), badges: Object.fromEntries(BADGES.map((b, i) => [b.id, i])) });
    expect(m.rows[0]).toEqual(['Time to the Sun', 'not yet']);
    expect(m.badges.length).toBe(11); expect(m.more).toBe(BADGES.length - 11);
    expect(m.title).toBe('Stage 1 of 20: On the Table');
  });
  it('makes a tidy file name', () => { expect(shareFileName('Dr. Ooze 🧪')).toBe('goop-dr-ooze.png'); expect(shareFileName('!!!')).toBe('goop-card.png'); });
});

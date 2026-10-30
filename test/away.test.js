import { describe, it, expect } from 'vitest';
import { AWAY_GROUPS, awayGroup, awayJoke, awayReport, burpBonus, awayFor } from '../src/away.js';
import { STAGES } from '../src/econ.js';

describe('the offline-return ritual', () => {
  it('every stage has a joke group, and every group has jokes', () => {
    for (let k = 0; k < STAGES.length; k++) expect(awayGroup(k)).toBeGreaterThanOrEqual(0);
    expect(AWAY_GROUPS.length).toBeGreaterThanOrEqual(5);
    for (const g of AWAY_GROUPS) expect(g.lines.length).toBeGreaterThanOrEqual(3);
    expect(awayGroup(0)).not.toBe(awayGroup(19));
  });
  it('the joke is from the goop\'s stage group', () => {
    expect(AWAY_GROUPS[awayGroup(0)].lines).toContain(awayJoke(0, () => 0.5));
    expect(AWAY_GROUPS[awayGroup(12)].lines).toContain(awayJoke(12, () => 0.99));
  });
  it('a minute or less, or nothing earned, shows no card', () => {
    expect(awayReport(60, 100, 0)).toBe(null);
    expect(awayReport(3600, 0, 0)).toBe(null);
    const r = awayReport(61, 100, 3, () => 0);
    expect(r).toMatchObject({ secs: 61, n: 100, stage: 3, burped: false });
  });
  it('the burp doubles the away pay, once per return', () => {
    const r = awayReport(7200, 5000, 4);
    expect(burpBonus(r)).toBe(5000);
    expect(burpBonus(r)).toBe(0);
    expect(burpBonus(null)).toBe(0);
  });
  it('says how long you were gone', () => {
    expect(awayFor(90)).toBe('2 min'); expect(awayFor(3600)).toBe('1 h'); expect(awayFor(8000)).toBe('2 h 13 min'); expect(awayFor(27 * 3600)).toBe('1 day 3 h');
  });
});

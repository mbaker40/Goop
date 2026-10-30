import { describe, it, expect } from 'vitest';
import { STAGES, END, stageOf, stageProgress, massGrams, earn, newState } from '../src/econ.js';

describe('stage math', () => {
  it('maps lifetime slop to the right stage', () => {
    expect(stageOf(0)).toBe(0);
    expect(stageOf(1999)).toBe(0);
    expect(stageOf(2000)).toBe(1);
    expect(stageOf(1.5e5)).toBe(2);
    expect(stageOf(6e11)).toBe(5);
    expect(stageOf(1e20)).toBe(5);
  });
  it('measures progress in orders of magnitude, 0 at entry and near 1 at the next', () => {
    for (let k = 1; k < STAGES.length; k++) {
      expect(stageProgress(STAGES[k].at)).toBeCloseTo(0, 6);
      const next = k + 1 < STAGES.length ? STAGES[k + 1].at : END.at;
      expect(stageProgress(next * 0.999999)).toBeGreaterThan(0.99);
    }
  });
  it('maps mass to the real-world anchor at each stage entry', () => {
    for (let k = 1; k < STAGES.length; k++) expect(massGrams(STAGES[k].at) / STAGES[k].grams).toBeCloseTo(1, 6);
  });
  it('earn moves the stage and flags the win at the Sun', () => {
    const s = newState();
    expect(earn(s, 2500)).toBe(true);
    expect(s.stage).toBe(1);
    expect(earn(s, 10)).toBe(false);
    earn(s, END.at);
    expect(s.won).toBe(true);
  });
});

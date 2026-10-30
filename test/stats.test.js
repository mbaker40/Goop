import { describe, it, expect } from 'vitest';
import { newStats, adoptStats, recordStage, seedUnknownStages, knownTime, UNKNOWN, SUN } from '../src/stats.js';
import { migrate } from '../src/save.js';
import { pastSun } from './fixtures/v2-saves.js';
import { late } from './fixtures/v1-saves.js';

describe('stage times for players who got there before times were kept', () => {
  it('a migrated player past the Sun does not get an inflated time for the stage after it', () => {
    const d = migrate(JSON.parse(pastSun));                               // stage 8 (index 7), times only up to the Sun
    expect(d.stats.runStageAt[7]).toBe(undefined);
    seedUnknownStages(d.stats, d.state.stage);
    expect(d.stats.runStageAt[7]).toBe(UNKNOWN);
    expect(recordStage(d.stats, 7, 99999)).toBe(false);                   // the next stage change records nothing for it
    expect(d.stats.bestStageAt[7]).toBe(undefined);
    expect(recordStage(d.stats, 8, 5000)).toBe(true);                     // a stage reached from now on is recorded
    expect(d.stats.runStageAt[SUN]).toBe(1900);                           // known times are left alone
  });
  it('a v1 player\'s stages behind the goop become unknown too', () => {
    const d = migrate(JSON.parse(late)); seedUnknownStages(d.stats, d.state.stage);
    expect(d.stats.runStageAt.slice(0, 4)).toEqual([0, UNKNOWN, UNKNOWN, UNKNOWN]);
  });
  it('UNKNOWN survives a save round-trip in runStageAt only, and is never a time to show', () => {
    const st = newStats(); st.runStageAt = [0, UNKNOWN, 50]; st.bestStageAt = [0, UNKNOWN, 50];
    const back = adoptStats(JSON.parse(JSON.stringify(st)));
    expect(back.runStageAt).toEqual([0, UNKNOWN, 50]); expect(back.bestStageAt).toEqual([0, null, 50]);
    expect(knownTime(UNKNOWN)).toBe(false); expect(knownTime(null)).toBe(false); expect(knownTime(0)).toBe(true);
  });
  it('a normal save has nothing to seed', () => {
    const st = newStats(); st.runStageAt = [0, 10, 20]; seedUnknownStages(st, 2);
    expect(st.runStageAt).toEqual([0, 10, 20]);
  });
  it('the new counters exist and are sanitised', () => {
    const st = adoptStats({ burps: 2, dailyDone: 'x', shares: -1 });
    expect([st.burps, st.dailyDone, st.shares]).toEqual([2, 0, 0]);
  });
});

import { newRun, stageRow, markSkipped, SKIPPED } from '../src/stats.js';
describe('stage times after a Head Start', () => {
  it('stages a Head Start jumps over are skipped, never recorded, and the notebook says so', () => {
    const st = newStats(); newRun(st, 1);
    expect(st.runStageAt).toEqual([0, SKIPPED]);
    expect(recordStage(st, 1, 0)).toBe(false); expect(st.bestStageAt[1]).toBe(undefined);
    expect(stageRow(st, 1)).toEqual({ best: null, from: 0, run: 'skipped' });
    expect(recordStage(st, 2, 9, 1)).toBe(true);
    expect(stageRow(st, 2)).toEqual({ best: 9, from: 1, run: 9 });
    newRun(st, 0); recordStage(st, 1, 65); recordStage(st, 2, 120);
    expect(stageRow(st, 1)).toEqual({ best: 65, from: 0, run: 65 }); expect(stageRow(st, 2).best).toBe(9);
  });
  it('an older save\'s zero-second times for skipped stages become skipped; SKIPPED survives a round trip', () => {
    const st = newStats(); st.runStageAt = [0, 0, 30]; markSkipped(st, 1);
    expect(st.runStageAt).toEqual([0, SKIPPED, 30]);
    st.bestStageFrom = [0, 0, 1];
    const back = adoptStats(JSON.parse(JSON.stringify(st)));
    expect(back.runStageAt).toEqual([0, SKIPPED, 30]); expect(back.bestStageFrom).toEqual([0, 0, 1]);
    expect(knownTime(SKIPPED)).toBe(false);
  });
});

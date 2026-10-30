import { describe, it, expect } from 'vitest';
import { migrate, loadSave, writeSave, exportString, importString, SAVE_KEY, LEGACY_KEY, SAVE_VERSION } from '../src/save.js';
import { createMemoryStorage } from '../src/platform/storage.js';
import { early, late } from './fixtures/v1-saves.js';
import { pastSun, midGame } from './fixtures/v2-saves.js';
import { SUN_AT, STAGES, FEEDERS } from '../src/econ.js';
import { SUN } from '../src/stats.js';
import { dueMilestones, passMilestones } from '../src/milestones.js';

describe('save migration from v1', () => {
  it('keeps slop, upgrades, feeders, stage and sound from a captured v1 save', () => {
    const d = migrate(JSON.parse(early));
    expect(d.v).toBe(SAVE_VERSION);
    expect(d.state.slop).toBeCloseTo(0.18235);
    expect(d.state.life).toBeCloseTo(93.18235);
    expect(d.state.own[0]).toBe(2);
    expect(d.state.ups).toEqual({ spoon: true });
    expect(d.state.feeds).toBe(70);
    expect(d.state.stage).toBe(0);
    expect(d.prefs.sound).toBe(false);
    expect(d.at).toBe(1793324846792);
    expect(d.stats.feeds).toBe(70);
  });
  it('a late v1 save: hops become Star Dust, unknown upgrades are dropped, the stage is recomputed', () => {
    const d = migrate(JSON.parse(late));
    expect(d.state.asc).toBe(2);
    expect(d.state.dust).toBe(12);
    expect(d.state.stage).toBe(3);
    expect(d.state.own.slice(0, 10)).toEqual([40, 35, 30, 25, 20, 12, 6, 2, 0, 0]);
    expect(d.state.own.slice(10).every(n => n === 0)).toBe(true);
    expect(d.state.ups.mut3).toBe(true); expect(d.state.ups.bogus).toBeUndefined();
    expect(d.state.slop).toBe(81234567.5);
    expect(d.stats.hops).toBe(2); expect(d.stats.lifetimeSlop).toBe(3.2e9);
  });
  it('loads the v1 key when there is no v2 save, writes v2 and leaves the v1 key untouched', () => {
    const storage = createMemoryStorage({ [LEGACY_KEY]: late });
    const { data, from } = loadSave(storage);
    expect(from).toBe('v1');
    writeSave(storage, data);
    expect(storage.get(LEGACY_KEY)).toBe(late);
    const again = loadSave(storage);
    expect(again.from).toBe('v2');
    expect(again.data.state.slop).toBe(81234567.5);
    expect(again.data.state.dust).toBe(12);                   // not paid twice
  });
  it('prefers the v2 save over the v1 backup', () => {
    const v2 = migrate(JSON.parse(early)); v2.state.slop = 999;
    const storage = createMemoryStorage({ [LEGACY_KEY]: late, [SAVE_KEY]: JSON.stringify(v2) });
    expect(loadSave(storage).data.state.slop).toBe(999);
  });
  it('survives garbage', () => {
    expect(migrate(null)).toBe(null);
    expect(migrate({ state: 'nope' })).toBe(null);
    const storage = createMemoryStorage({ [SAVE_KEY]: '{not json', [LEGACY_KEY]: early });
    expect(loadSave(storage).from).toBe('v1');
    const d = migrate({ v: 2, state: { slop: -5, life: NaN, own: ['x', 3], perks: { head: 99, nope: 1 } } });
    expect(d.state.slop).toBe(0); expect(d.state.own[1]).toBe(3); expect(d.state.perks).toEqual({ head: 1 });
  });
});

describe('save migration from v2 (six stages) to v3 (twenty)', () => {
  it('a goop already past the Sun lands on the right new stage with nothing lost', () => {
    const before = JSON.parse(pastSun), d = migrate(before);
    expect(SAVE_VERSION).toBe(3); expect(d.v).toBe(3); expect(d.schema).toBe(2);
    expect(d.state.life).toBe(4.2e15); expect(d.state.slop).toBe(3.1e15);
    expect(d.state.stage).toBe(7); expect(STAGES[d.state.stage].name).toBe('Nebula Nibbler');
    expect(d.state.won).toBe(true); expect(d.state.winSeen).toBe(true); expect(d.state.ate).toBe(false);
    expect(d.state.own.slice(0, 10)).toEqual(before.state.own); expect(d.state.own.length).toBe(FEEDERS.length);
    expect(d.state.ups).toEqual(before.state.ups);
    expect(d.state.asc).toBe(2); expect(d.state.dust).toBe(4); expect(d.state.perks).toEqual({ head: 1, fingers: 1 });
    expect(d.badges).toEqual(before.badges); expect(d.bests).toEqual(before.bests); expect(d.profile.name).toBe('Dr. Ooze'); expect(d.prefs.sound).toBe(false);
    // the Sun's times stay at the same index, which is now also stage 7's door
    expect(d.stats.bestStageAt[SUN]).toBe(1700); expect(d.stats.runStageAt[SUN]).toBe(1900);
    // milestones behind the goop are marked done quietly: no flood of toasts or bonuses on first load
    expect(dueMilestones(d.state)).toEqual([]); expect(passMilestones(d.state)).toEqual([]);
    expect(Object.keys(d.state.miles).length).toBeGreaterThan(20);
  });
  it('a goop short of the Sun stays where it was', () => {
    const d = migrate(JSON.parse(midGame));
    expect(d.schema).toBe(2); expect(d.state.stage).toBe(3); expect(d.state.won).toBe(false); expect(d.state.slop).toBe(1e8);
    expect(dueMilestones(d.state)).toEqual([]);
  });
  it('the v2 key is migrated in place, once; the v1 backup is untouched', () => {
    const storage = createMemoryStorage({ [SAVE_KEY]: pastSun, [LEGACY_KEY]: late });
    const first = loadSave(storage);
    expect(first.from).toBe('v2'); expect(first.data.schema).toBe(2);
    writeSave(storage, first.data);
    const raw = JSON.parse(storage.get(SAVE_KEY));
    expect(raw.v).toBe(3); expect(raw.schema).toBeUndefined();
    expect(storage.get(LEGACY_KEY)).toBe(late);
    const again = loadSave(storage);
    expect(again.data.schema).toBe(3); expect(again.data.state.stage).toBe(7); expect(again.data.state.slop).toBe(3.1e15);
  });
  it('a v3 save round-trips milestones and the universe flag', () => {
    const d = migrate(JSON.parse(pastSun));
    d.state.ate = true; d.state.miles = { m1a: true, bogus: true };
    const back = migrate(JSON.parse(JSON.stringify({ ...d, v: 3 })));
    expect(back.state.ate).toBe(true); expect(back.state.miles).toEqual({ m1a: true });
  });
  it('a v1 save goes all the way to v3', () => {
    const d = migrate(JSON.parse(late));
    expect(d.v).toBe(3); expect(d.schema).toBe(1); expect(d.state.stage).toBe(3);
    expect(SUN_AT).toBe(3e13);
  });
});

describe('export and import', () => {
  it('round-trips a save as a copyable string', () => {
    const d = migrate(JSON.parse(late));
    d.badges = { feed1: 123 }; d.profile = { name: 'Dr. Ooze 🧪' };
    const str = exportString(d);
    expect(str.startsWith('GOOP2:')).toBe(true);
    expect(str).toMatch(/^GOOP2:[A-Za-z0-9+/=]+$/);
    const back = importString('  ' + str + '\n');
    expect(back.state).toEqual(d.state);
    expect(back.badges).toEqual({ feed1: 123 });
    expect(back.profile.name).toBe('Dr. Ooze 🧪');
  });
  it('also accepts raw v1 JSON, and refuses junk with a friendly message', () => {
    expect(importString(early).state.own[0]).toBe(2);
    expect(() => importString('hello')).toThrow(/does not look like/);
    expect(() => importString('')).toThrow(/empty/);
  });
});

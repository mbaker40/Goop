import { describe, it, expect } from 'vitest';
import { migrate, loadSave, writeSave, exportString, importString, serialize, adoptPrefs, adoptProfile, saveHealth, SAVE_KEY, SHADOW_KEY, OLD_SHADOW_KEYS, CORRUPT_KEY, LEGACY_KEY, SAVE_VERSION } from '../src/save.js';
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
    expect(SAVE_VERSION).toBe(4); expect(d.v).toBe(4); expect(d.schema).toBe(2);
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
    expect(raw.v).toBe(SAVE_VERSION); expect(raw.schema).toBeUndefined();
    expect(storage.get(LEGACY_KEY)).toBe(late);
    const again = loadSave(storage);
    expect(again.data.schema).toBe(SAVE_VERSION); expect(again.data.state.stage).toBe(7); expect(again.data.state.slop).toBe(3.1e15);
  });
  it('a v3 save round-trips milestones and the universe flag', () => {
    const d = migrate(JSON.parse(pastSun));
    d.state.ate = true; d.state.miles = { m1a: true, bogus: true };
    const back = migrate(JSON.parse(JSON.stringify({ ...d, v: 3 })));
    expect(back.state.ate).toBe(true); expect(back.state.miles).toEqual({ m1a: true });
  });
  it('a v1 save goes all the way to the current schema', () => {
    const d = migrate(JSON.parse(late));
    expect(d.v).toBe(SAVE_VERSION); expect(d.schema).toBe(1); expect(d.state.stage).toBe(3);
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

describe('an old six-stage tab saving over an Act 2 save', () => {
  // What the origin/main (six-stage) build writes when it saves a v3 game: it keeps life, slop, dust and
  // perks, but only the first ten feeders and the upgrades it knows, and stamps it v: 2.
  const OLD_UPS = new Set(['spoon', 'ladle', 'cata', 'treb', 'rail', 'orbital', 'mut1', 'mut2', 'mut3', 'mut4', 'mut5', 'mut6',
    ...['pipette', 'intern', 'chute', 'truck', 'pipeline', 'siphon', 'grinder', 'lasso', 'cracker', 'straw'].flatMap(id => [id + '2', id + '3'])]);
  const oldBuildSave = d => {
    const st = d.state;
    const ups = Object.fromEntries(Object.keys(st.ups).filter(id => OLD_UPS.has(id)).map(id => [id, true]));
    return JSON.stringify({ v: 2, at: d.at + 1000, prefs: d.prefs, state: { ...st, own: st.own.slice(0, 10), ups, miles: undefined, ate: undefined }, stats: d.stats, badges: d.badges, bests: d.bests, profile: d.profile });
  };
  const act2Save = () => {
    const d = migrate(JSON.parse(pastSun));
    d.state.own[10] = 12; d.state.own[11] = 7; d.state.own[12] = 3;               // Dyson Funnel, Comet Conveyor, Event Horizon Spork
    d.state.ups.mut7 = true; d.state.ups.mut8 = true; d.state.ups.dyson2 = true;
    d.stats.playSecs = 5000;
    return d;
  };
  it('reproduces the downgrade, then recovers the feeders and Mutations from the shadow copy', () => {
    const storage = createMemoryStorage();
    writeSave(storage, act2Save());
    expect(JSON.parse(storage.get(SHADOW_KEY)).v).toBe(SAVE_VERSION);
    // the old tab saves over the main key
    storage.set(SAVE_KEY, oldBuildSave(JSON.parse(storage.get(SAVE_KEY))));
    const downgraded = migrate(JSON.parse(storage.get(SAVE_KEY)));
    expect(downgraded.state.own.slice(10, 13)).toEqual([0, 0, 0]);                 // this is the loss
    expect(downgraded.state.ups.mut7).toBeUndefined();
    const { data, from } = loadSave(storage);
    console.log('downgrade: main key v' + JSON.parse(oldBuildSave(act2Save())).v + ' own[10..12] ' + downgraded.state.own.slice(10, 13).join(',') + ', mut7 ' + !!downgraded.state.ups.mut7 +
      ' -> loaded from ' + from + ': own[10..12] ' + data.state.own.slice(10, 13).join(',') + ', mut7 ' + data.state.ups.mut7 + ', mut8 ' + data.state.ups.mut8 + ', dyson2 ' + data.state.ups.dyson2 + ', main key now v' + JSON.parse(storage.get(SAVE_KEY)).v);
    expect(from).toBe('shadow');
    expect(data.state.own.slice(10, 13)).toEqual([12, 7, 3]);
    expect(data.state.ups).toMatchObject({ mut7: true, mut8: true, dyson2: true, mut5: true });
    expect(data.state.life).toBe(4.2e15); expect(data.state.stage).toBe(7);
    expect(JSON.parse(storage.get(SAVE_KEY)).v).toBe(SAVE_VERSION);              // the main key is put right
    expect(loadSave(storage).from).toBe('v2');                                    // and from then on loads normally
  });
  it('keeps the main save when the old tab has really played on longer', () => {
    const storage = createMemoryStorage();
    writeSave(storage, act2Save());
    const old = JSON.parse(oldBuildSave(JSON.parse(storage.get(SAVE_KEY)))); old.stats.playSecs = 9000; old.state.slop = 123;
    storage.set(SAVE_KEY, JSON.stringify(old));
    const { data, from } = loadSave(storage);
    expect(from).toBe('v2'); expect(data.state.slop).toBe(123);
  });
  it('a plain v2 player with no shadow copy migrates as before', () => {
    const storage = createMemoryStorage({ [SAVE_KEY]: pastSun });
    expect(loadSave(storage).from).toBe('v2');
  });
});

describe('schema 4: Big Bangs on the state, settings, and the shadow as a fallback', () => {
  const v3 = () => { const d = migrate(JSON.parse(pastSun)); d.stats.bigBangs = 3; d.stats.playSecs = 4000; return JSON.parse(JSON.stringify({ ...d, v: 3 })); };
  it('a v3 save gains the Big Bang count from its stats, and default settings', () => {
    const d = migrate(v3());
    expect(d.schema).toBe(3); expect(d.state.bangs).toBe(3);
    expect(d.prefs).toEqual({ sound: false, haptics: true, numbers: 'names', motion: 'system' });
    const back = migrate(JSON.parse(serialize({ ...d, state: { ...d.state, bangs: 5 } })));
    expect(back.state.bangs).toBe(5);                                    // from v4 on, the state's own count wins
  });
  it('settings are sanitised', () => {
    expect(adoptPrefs({ sound: false, haptics: false, numbers: 'sci', motion: 'reduce' })).toEqual({ sound: false, haptics: false, numbers: 'sci', motion: 'reduce' });
    expect(adoptPrefs({ numbers: 'roman', motion: 'warp' })).toEqual({ sound: true, haptics: true, numbers: 'names', motion: 'system' });
    expect(adoptPrefs(null).sound).toBe(true);
  });
  it('a profile keeps only a sane name and token', () => {
    expect(adoptProfile({ name: 'Dr. Ooze', token: 'abcdefghijklmnopqrst', evil: '<x>' })).toEqual({ name: 'Dr. Ooze', token: 'abcdefghijklmnopqrst' });
    expect(adoptProfile({ name: 5, token: 'short' })).toEqual({ name: '' });
  });
  it('the twenty-stage build (v3) writing over a v4 save is recovered from the v4 shadow', () => {
    const storage = createMemoryStorage();
    const d = migrate(v3()); d.state.perks = { ...d.state.perks, crumbs: 2, late: 1 }; d.state.bangs = 3;
    writeSave(storage, d);
    // what the v3 build writes back: it drops perks it does not know and the Big Bang count, and stamps v: 3
    const old = JSON.parse(storage.get(SAVE_KEY)); old.v = 3; old.state.perks = { head: 1, fingers: 1 }; delete old.state.bangs; old.at += 1000;
    storage.set(SAVE_KEY, JSON.stringify(old)); storage.set(OLD_SHADOW_KEYS[0], JSON.stringify(old));
    const { data, from } = loadSave(storage);
    expect(from).toBe('shadow'); expect(data.state.perks).toMatchObject({ crumbs: 2, late: 1 }); expect(data.state.bangs).toBe(3);
    expect(JSON.parse(storage.get(SAVE_KEY)).v).toBe(SAVE_VERSION);
  });
  it('a corrupt main save is kept aside, the shadow loads instead, and the player is told', () => {
    const storage = createMemoryStorage();
    const d = migrate(v3()); d.state.slop = 777; writeSave(storage, d);
    storage.set(SAVE_KEY, '{"v":4,"state":{"slop":1');                  // a write cut short
    storage.set(LEGACY_KEY, early);
    const r = loadSave(storage);
    expect(r.from).toBe('shadow'); expect(r.corrupt).toBe(true); expect(r.data.state.slop).toBe(777);
    expect(storage.get(CORRUPT_KEY)).toBe('{"v":4,"state":{"slop":1');
    expect(saveHealth(storage)).toMatchObject({ corrupt: true });
  });
  it('a corrupt main save with no shadow falls back to v1 loudly, not silently; with nothing, a fresh start, still told', () => {
    const storage = createMemoryStorage({ [SAVE_KEY]: 'garbage', [LEGACY_KEY]: early });
    expect(loadSave(storage)).toMatchObject({ from: 'v1', corrupt: true });
    expect(loadSave(createMemoryStorage({ [SAVE_KEY]: 'garbage' }))).toMatchObject({ data: null, from: null, corrupt: true });
    expect(loadSave(createMemoryStorage({ [SAVE_KEY]: JSON.stringify({ v: 4, state: 'nope' }) })).corrupt).toBe(true);
  });
  it('a missing main save loads from the shadow', () => {
    const storage = createMemoryStorage();
    const d = migrate(v3()); d.state.slop = 4242; writeSave(storage, d); storage.remove(SAVE_KEY);
    expect(loadSave(storage)).toMatchObject({ from: 'shadow', corrupt: false }); expect(loadSave(storage).data.state.slop).toBe(4242);
  });
  it('a fresh browser has nothing to load and nothing is corrupt', () => {
    expect(loadSave(createMemoryStorage())).toEqual({ data: null, from: null, corrupt: false });
  });
  it('save health: the schema and whether the shadow is in step', () => {
    const storage = createMemoryStorage();
    expect(saveHealth(storage)).toEqual({ schema: null, shadow: 'missing', corrupt: false });
    writeSave(storage, migrate(v3()));
    expect(saveHealth(storage)).toEqual({ schema: SAVE_VERSION, shadow: 'in step', corrupt: false });
    storage.set(SAVE_KEY, storage.get(SAVE_KEY).replace('"v":4', '"v":4 '));
    expect(saveHealth(storage).shadow).toBe('behind');
  });
});

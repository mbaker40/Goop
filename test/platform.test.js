import { describe, it, expect, vi } from 'vitest';
import { createLocalScores, localBoard, BOARDS, BOARD_KINDS, LOCAL_NOTE } from '../src/platform/scores.js';
import { createLocalIdentity, validateName, foldName, DEFAULT_NAME } from '../src/platform/identity.js';
import { cloudConfig, hostOf } from '../src/platform/config.js';
import { createCloudScores, fromServer, runSummary, OFFLINE_NOTE } from '../src/platform/scores.cloud.js';
import { createCloudIdentity } from '../src/platform/identity.cloud.js';
import { createCloudDaily, createLocalDaily } from '../src/platform/daily.js';
import { createSteamStorage } from '../src/platform/storage.steam.js';
import { createSteamAchievements } from '../src/platform/achievements.steam.js';
import { createSteamScores, STEAM_BOARDS } from '../src/platform/scores.steam.js';
import { createPlatform } from '../src/platform/index.js';
import { localDaily } from '../src/daily.js';

const okJson = body => vi.fn(async () => ({ ok: true, json: async () => body }));
const down = () => vi.fn(async () => { throw new Error('offline'); });

describe('local scores: the five boards as personal bests', () => {
  it('the five design boards exist, in order', () => {
    expect(BOARD_KINDS).toEqual(['sun', 'universe', 'week', 'daily', 'bigbangs']);
    for (const k of BOARD_KINDS) expect(BOARDS[k].name.length).toBeGreaterThan(5);
  });
  it('times keep the lowest, counts the highest', () => {
    const s = createLocalScores();
    expect(s.submit('sun', 900).improved).toBe(true); expect(s.submit('sun', 1000).improved).toBe(false); expect(s.submit('sun', 700).best).toBe(700);
    s.submit('bigbangs', 2); s.submit('bigbangs', 1); expect(s.best('bigbangs')).toBe(2);
    expect(s.submit('nope', 1).improved).toBe(false); expect(s.submit('sun', NaN).improved).toBe(false);
  });
  it('keyed boards keep one record per day or week, and sum the weekly slop', () => {
    const s = createLocalScores();
    s.submit('daily', 800, '2026-10-29'); s.submit('daily', 700, '2026-10-30'); s.submit('daily', 900, '2026-10-30');
    expect(s.best('daily', '2026-10-30')).toBe(700); expect(s.best('daily', '2026-10-29')).toBe(800);
    expect(s.submit('daily', 1).improved).toBe(false);                     // a keyed board needs its key
    s.add('week', 1e6, '2026-10-26'); s.add('week', 5e5, '2026-10-26');
    expect(s.best('week', '2026-10-26')).toBe(1.5e6);
    expect(Object.keys(s.all())).toEqual(['daily:2026-10-29', 'daily:2026-10-30', 'week:2026-10-26']);
  });
  it('old keyed records are pruned', () => {
    const s = createLocalScores();
    for (let d = 1; d <= 40; d++) s.submit('daily', 600 + d, '2026-09-' + String(d).padStart(2, '0'));
    expect(Object.keys(s.all()).length).toBe(BOARDS.daily.keep);
  });
  it('a board is a list of your own records, in the same shape a server board has', async () => {
    const s = createLocalScores();
    s.submit('daily', 800, '2026-10-29'); s.submit('daily', 700, '2026-10-28'); s.submit('daily', 900, '2026-10-30');
    const b = await s.board('daily', { name: 'Dr. Ooze', key: '2026-10-30' });
    expect(b).toMatchObject({ kind: 'daily', title: BOARDS.daily.name, source: 'local', note: LOCAL_NOTE });
    expect(b.entries.map(e => [e.rank, e.label, e.value, e.current])).toEqual([[1, '2026-10-30', 900, true], [2, '2026-10-28', 700, false], [3, '2026-10-29', 800, false]]);
    expect(localBoard({}, 'sun').entries).toEqual([]);
    expect(localBoard({ sun: 700 }, 'sun', { name: 'Al' }).entries).toEqual([{ rank: 1, name: 'Al', value: 700, label: '', you: true, current: true }]);
    expect(LOCAL_NOTE).toMatch(/your own records/);
  });
});

describe('local identity: the name chooser rules', () => {
  it('3 to 16 characters, a few safe symbols, at least one letter or number', () => {
    expect(validateName('Dr. Ooze')).toMatchObject({ ok: true, name: 'Dr. Ooze' });
    expect(validateName('  Dr    Ooze  ').name).toBe('Dr Ooze');
    expect(validateName('Zoë_42').ok).toBe(true);
    expect(validateName('ab').ok).toBe(false); expect(validateName('a'.repeat(17)).ok).toBe(false);
    expect(validateName('<script>').ok).toBe(false); expect(validateName('...').ok).toBe(false); expect(validateName(null).ok).toBe(false);
  });
  it('a small blocklist, with look-alike digits folded', () => {
    expect(foldName('Sh1t 4ever')).toBe('shitaever');
    for (const n of ['fuckface', 'SH1T', 'B.i.t.c.h', 'Admin', 'n4zi goop']) expect(validateName(n).ok, n).toBe(false);
    expect(validateName('Mr Snuggles').ok).toBe(true);
  });
  it('the provider keeps an old long name on load, and only sets a valid new one', () => {
    const id = createLocalIdentity();
    expect(id.name()).toBe(DEFAULT_NAME); expect(id.hasName()).toBe(false);
    id.load({ name: 'A Rather Long Old Name 1' }); expect(id.name()).toBe('A Rather Long Old Name 1');
    expect(id.setName('no').ok).toBe(false); expect(id.name()).toBe('A Rather Long Old Name 1');
    expect(id.setName('Goop Fan').ok).toBe(true); expect(id.snapshot()).toEqual({ name: 'Goop Fan' });
  });
});

describe('provider selection: local by default, cloud only on a flag', () => {
  it('cloud is off without a flag, on with the build flag or ?cloud=1, and always needs an API', () => {
    expect(cloudConfig({}, '').enabled).toBe(false);
    expect(cloudConfig({ VITE_GOOP_API: 'https://w.example' }, '').enabled).toBe(false);
    expect(cloudConfig({ VITE_GOOP_CLOUD: '1', VITE_GOOP_API: 'https://w.example/' }, '')).toEqual({ enabled: true, api: 'https://w.example' });
    expect(cloudConfig({}, '?cloud=1&api=https://x.example')).toEqual({ enabled: true, api: 'https://x.example' });
    expect(cloudConfig({}, '?cloud=1').enabled).toBe(false);
    expect(cloudConfig({}, '?cloud=1&api=javascript:alert(1)').enabled).toBe(false);
  });
  it('the default platform is all local', () => {
    const p = createPlatform({ win: null, env: {}, search: '' });
    expect([p.host, p.cloud.enabled, p.scores.kind, p.identity.kind, p.daily.kind, p.achievements.kind]).toEqual(['web', false, 'local', 'local', 'local', 'local']);
  });
  it('steam only with the desktop bridge', () => {
    expect(hostOf({ goopHost: 'steam' })).toBe('web');
    const win = { goopHost: 'steam', goopDesktop: { readSave: () => null, writeSave: () => true } };
    const p = createPlatform({ win, env: {}, search: '' });
    expect([p.host, p.storage.kind, p.achievements.kind, p.scores.kind]).toEqual(['steam', 'steam-file', 'steam', 'steam']);
  });
  it('cloud providers with the flag', () => {
    const p = createPlatform({ win: null, env: {}, search: '?cloud=1&api=https://w.example' });
    expect([p.scores.kind, p.identity.kind, p.daily.kind]).toEqual(['cloud', 'cloud', 'cloud']);
  });
});

describe('cloud providers (no Worker is deployed: these use a fake fetch)', () => {
  it('a board from the Worker is mapped onto the panel\'s shape', async () => {
    const f = okJson({ entries: [{ rank: 1, name: 'Ann', value: 600 }, { rank: 2, name: 'Dr. Ooze', value: 700, flagged: true }] });
    const s = createCloudScores('https://w.example', { fetchImpl: f });
    const b = await s.board('sun', { name: 'Dr. Ooze' });
    expect(f).toHaveBeenCalledWith('https://w.example/board/sun', expect.objectContaining({ method: 'GET' }));
    expect(b.source).toBe('cloud');
    expect(b.entries[1]).toMatchObject({ rank: 2, name: 'Dr. Ooze', you: true, label: 'Suspicious Goop' });
    expect(fromServer({ nope: 1 }, 'sun')).toBe(null);
  });
  it('offline, the board falls back to your local records and says so', async () => {
    const local = createLocalScores(); local.submit('sun', 650);
    const s = createCloudScores('https://w.example', { local, fetchImpl: down() });
    const b = await s.board('sun', { name: 'Me' });
    expect(b.source).toBe('local'); expect(b.note).toBe(OFFLINE_NOTE); expect(b.entries[0].value).toBe(650);
  });
  it('a new best is kept locally and posted with a token; without a token nothing is sent', async () => {
    const f = okJson({ ok: true });
    let tok = null;
    const s = createCloudScores('https://w.example', { fetchImpl: f, token: () => tok });
    expect(s.submit('sun', 700).improved).toBe(true); expect(f).not.toHaveBeenCalled();
    tok = 'abcdefghijklmnop1234';
    s.submit('sun', 650, null, { clicks: 640 });
    expect(f).toHaveBeenCalledWith('https://w.example/submit', expect.objectContaining({ method: 'POST' }));
    expect(JSON.parse(f.mock.calls[0][1].body)).toMatchObject({ kind: 'sun', value: 650, clicks: 640 });
    expect(f.mock.calls[0][1].headers.authorization).toBe('Bearer ' + tok);
    expect(s.best('sun')).toBe(650);
    expect(runSummary('daily', 600, { key: '2026-10-30' }).key).toBe('2026-10-30');
  });
  it('claiming a name stores the token; offline the name is still set locally', async () => {
    const id = createCloudIdentity('https://w.example', { fetchImpl: okJson({ name: 'Dr Ooze 2', token: 'tok_abcdefghijklmnop', recovery: 'salty-pipette-42' }) });
    const r = await id.claim('Dr Ooze');
    expect(r).toMatchObject({ ok: true, claimed: true, name: 'Dr Ooze 2', recovery: 'salty-pipette-42' });
    expect(id.token()).toBe('tok_abcdefghijklmnop'); expect(id.snapshot()).toMatchObject({ name: 'Dr Ooze', token: 'tok_abcdefghijklmnop', claimed: 'Dr Ooze 2' });
    const off = createCloudIdentity('https://w.example', { fetchImpl: down() });
    expect(await off.claim('Dr Ooze')).toMatchObject({ ok: true, claimed: false }); expect(off.name()).toBe('Dr Ooze');
    expect((await off.claim('x')).ok).toBe(false);
  });
  it('the daily seed falls back to the local date rule when /daily is unavailable or odd', async () => {
    const now = () => Date.UTC(2026, 9, 30, 9);
    expect(await createCloudDaily('https://w.example', { fetchImpl: down(), now }).today()).toEqual(localDaily(now()));
    expect(await createCloudDaily('https://w.example', { fetchImpl: okJson({ date: '2026-10-30', seed: 7, mutator: 'busy' }), now }).today()).toMatchObject({ seed: 7, mutator: 'busy', source: 'cloud' });
    expect(await createCloudDaily('https://w.example', { fetchImpl: okJson({ garbage: true }), now }).today()).toEqual(localDaily(now()));
    expect(await createLocalDaily(now).today()).toEqual(localDaily(now()));
  });
});

describe('steam providers (desktop bridge; no Steam needed)', () => {
  const fakeBridge = () => {
    const files = new Map(), calls = [];
    return { files, calls, readSave: k => (files.has(k) ? files.get(k) : null), writeSave: (k, v) => { files.set(k, v); return true; }, removeSave: k => files.delete(k), unlockAchievement: id => calls.push(['ach', id]), postScore: (b, v) => calls.push(['score', b, v]) };
  };
  it('storage goes through the bridge; without one it is memory', () => {
    const b = fakeBridge(), s = createSteamStorage(b);
    s.set('k', 'v'); expect(b.files.get('k')).toBe('v'); expect(s.get('k')).toBe('v'); s.remove('k'); expect(s.get('k')).toBe(null);
    const m = createSteamStorage(null); expect(m.kind).toBe('memory'); m.set('a', 1); expect(m.get('a')).toBe('1');
    const broken = createSteamStorage({ readSave: () => { throw new Error('x'); }, writeSave: () => { throw new Error('x'); } });
    expect(broken.get('a')).toBe(null); expect(broken.set('a', 'b')).toBe(false);
  });
  it('a new badge also unlocks the Steam achievement, once; loading re-syncs', () => {
    const b = fakeBridge(), a = createSteamAchievements(b);
    expect(a.unlock('feed1')).toBe(true); expect(a.unlock('feed1')).toBe(false);
    expect(b.calls).toEqual([['ach', 'feed1']]);
    a.load({ sun: 5, feed1: 1 }); expect(b.calls.filter(c => c[0] === 'ach').length).toBe(3);
    expect(createSteamAchievements(null).unlock('x')).toBe(true);           // no bridge: a no-op, the shelf still works
  });
  it('a new best is posted to the mirrored Steam board', () => {
    const b = fakeBridge(), s = createSteamScores(b);
    s.submit('sun', 700.4); s.submit('sun', 800); s.submit('peak', 1e9);
    expect(b.calls).toEqual([['score', STEAM_BOARDS.sun, 700]]);
  });
});

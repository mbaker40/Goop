// The leaderboard Worker's pure parts, in Node: no Miniflare, no deploy. See worker/README.md.
import { describe, it, expect } from 'vitest';
import { checkRun, summaryProblem, startState, TOLERANCE, MAX_CLAIM_SECS, SIM_BUDGET } from '../worker/src/plausible.js';
import { runSummary } from '../src/platform/scores.cloud.js';
import { runClaim } from '../src/stats.js';
import { newState } from '../src/econ.js';
import { newDailyRun } from '../src/daily.js';
import { freshRun } from '../src/prestige.js';
import { handle, STUB_NOTE } from '../worker/src/index.js';
import { maxedRun } from '../src/sim.js';
import { localDaily } from '../src/daily.js';

describe('the plausibility check (the game\'s own rules, replayed)', () => {
  it('an ordinary first run to the Sun passes', () => {
    const r = checkRun({ kind: 'sun', seconds: 760, clicks: 760, events: { frenzy: 4, geyser: 5 } });
    expect(r.flagged).toBe(false); expect(r.floor).toBeGreaterThan(400); expect(r.floor).toBeLessThan(1000);
  });
  it('a run far faster than the floor is flagged', () => {
    const r = checkRun({ kind: 'sun', seconds: 200, clicks: 200, events: {} });
    expect(r.flagged).toBe(true); expect(r.reason).toMatch(/floor/);
    const near = checkRun({ kind: 'sun', seconds: 650 * (1 - TOLERANCE) - 120, clicks: 600, events: {} });
    expect(near.flagged).toBe(true);
  });
  it('more feeds than the click cap allows, or more events than can turn up, are flagged', () => {
    expect(checkRun({ kind: 'sun', seconds: 600, clicks: 600 * 40 }).reason).toMatch(/click cap/);
    expect(checkRun({ kind: 'sun', seconds: 600, clicks: 600, events: { frenzy: 200 } }).reason).toMatch(/events/);
    expect(checkRun({ kind: 'daily', mutator: 'quiet', key: '2026-10-30', seconds: 900, clicks: 900, events: { frenzy: 5 } }).reason).toMatch(/events/);
  });
  it('perks and hops count: a maxed start is allowed to be much faster', () => {
    const s = maxedRun();
    const run = { kind: 'universe', seconds: 6400, clicks: 6400, events: {}, asc: s.asc, bangs: s.bangs, perks: s.perks };
    expect(startState(run).stage).toBe(6);
    expect(checkRun(run).flagged).toBe(false);
    expect(checkRun({ ...run, perks: {}, asc: 0, bangs: 0 }).flagged).toBe(true);     // the same time from a fresh dish is impossible
  }, 30000);
  it('the daily replays its mutator', () => {
    expect(checkRun({ kind: 'daily', mutator: 'pricey', key: '2026-10-30', seconds: 1100, clicks: 1100, events: {} }).flagged).toBe(false);
  });
  it('junk is refused before any simulation', () => {
    for (const bad of [null, {}, { kind: 'week', seconds: 5, clicks: 1 }, { kind: 'sun', seconds: -1, clicks: 0 }, { kind: 'sun', seconds: 600, clicks: 1, perks: { nope: 1 } }, { kind: 'daily', seconds: 600, clicks: 1, mutator: 'nope' }])
      expect(summaryProblem(bad)).not.toBe('');
    expect(checkRun({ kind: 'sun', seconds: 'x' }).flagged).toBe(true);
  });
  it('lookups are own properties only: prototype names are refused, never thrown on', () => {
    for (const perks of [{ constructor: 1 }, { toString: 1 }, { __proto__: { head: 1 } }, JSON.parse('{"__proto__": 1}'), [1]]) {
      const run = { kind: 'sun', seconds: 600, clicks: 600, perks };
      expect(() => checkRun(run)).not.toThrow();
      if (Object.keys(perks).length || Array.isArray(perks)) expect(summaryProblem(run)).not.toBe('');
    }
    for (const mutator of ['__proto__', 'constructor', 'hasOwnProperty', 'toString'])
      expect(summaryProblem({ kind: 'daily', key: '2026-10-30', seconds: 900, clicks: 900, mutator })).toBe('unknown daily');
    for (const kind of ['__proto__', 'constructor', 'toString']) expect(summaryProblem({ kind, seconds: 900, clicks: 900 })).toBe('not a time board');
  });
  it('odd claims cost little: a month is refused outright, a zero-click claim needs no replay, and no check outspends its budget', () => {
    expect(summaryProblem({ kind: 'universe', seconds: 30 * 24 * 3600, clicks: 0 })).toBe('seconds out of range');
    let t = performance.now();
    expect(checkRun({ kind: 'universe', seconds: MAX_CLAIM_SECS, clicks: 0 })).toMatchObject({ flagged: true, reason: expect.stringMatching(/without feeding/) });
    expect(performance.now() - t).toBeLessThan(50);
    // a trickle of feeds and a pantry to start from: the replay runs, inside its budget
    t = performance.now();
    const r = checkRun({ kind: 'universe', seconds: MAX_CLAIM_SECS, clicks: 3, perks: { pantry: 3 } });
    expect(r.flagged).toBe(false); expect(r.simulated).toBeLessThanOrEqual(SIM_BUDGET);
    expect(r.simulated).toBe(r.floor);                    // honest: one replay, stopped when it won
    expect(performance.now() - t).toBeLessThan(10000);
    // a claim too fast for any seed spends every seed, but never more than the budget
    const f = checkRun({ kind: 'sun', seconds: 150, clicks: 150 });
    expect(f.flagged).toBe(true); expect(f.simulated).toBeLessThanOrEqual(SIM_BUDGET); expect(f.simulated).toBeLessThanOrEqual(3 * (150 / (1 - TOLERANCE) + 600));
  }, 30000);
});

describe('what the game sends is what the check reads', () => {
  it('a main run claim carries its time, feeds, events, hops, perks and Big Bangs', () => {
    const s = freshRun({ asc: 3, dust: 0, perks: { head: 1, pantry: 2 }, bangs: 1 });
    s.played = 900; s.feeds = 850; s.caught = 9;
    const body = runSummary('sun', s.played, { ...runClaim(s), key: null });
    expect(body).toMatchObject({ kind: 'sun', value: 900, seconds: 900, clicks: 850, events: 9, asc: 3, perks: { head: 1, pantry: 2 }, bangs: 1 });
    expect(body.mutator).toBeUndefined();
    expect(summaryProblem(body)).toBe('');
    expect(startState(body).stage).toBe(1);                 // the Head Start the run really had
    expect(checkRun(body).flagged).toBe(false);
  });
  it('a daily claim carries its mutator and a plain start, whatever the main goop owns', () => {
    const run = newDailyRun({ date: '2026-10-30', seed: 1, mutator: 'pricey' });
    run.state.played = 1100; run.state.feeds = 1100; run.state.caught = 4;
    const body = runSummary('daily', 1100, { ...runClaim(run.state, run.mutator), key: run.date });
    expect(body).toMatchObject({ kind: 'daily', key: '2026-10-30', mutator: 'pricey', clicks: 1100, events: 4, asc: 0, perks: {}, bangs: 0 });
    expect(summaryProblem(body)).toBe('');
    expect(checkRun(body).flagged).toBe(false);
  });
  it('a claim without the run (the old payload) is what got every run flagged', () => {
    expect(checkRun(runSummary('sun', 900, {})).flagged).toBe(true);
    expect(summaryProblem(runSummary('daily', 900, { key: '2026-10-30' }))).toBe('unknown daily');
    expect(newState().caught).toBe(0);
  });
});

describe('the Worker routes (stubs, clearly marked)', () => {
  const call = async (method, path, body) => { const r = await handle(new Request('https://w.example' + path, { method, body: body ? JSON.stringify(body) : undefined }), { ALLOWED_ORIGIN: 'https://mbaker40.github.io' }); return { status: r.status, cors: r.headers.get('access-control-allow-origin'), body: await r.json().catch(() => null) }; };
  it('every route answers, and says it is a stub', async () => {
    for (const [m, p, b] of [['POST', '/claim', { name: 'Dr Ooze' }], ['POST', '/submit', { kind: 'sun', seconds: 760, clicks: 760 }], ['GET', '/board/sun'], ['GET', '/profile/Dr%20Ooze'], ['GET', '/daily'], ['GET', '/og/Dr%20Ooze.png']]) {
      const r = await call(m, p, b);
      expect(r.body.stub, p).toBe(true); expect(r.body.note).toBe(STUB_NOTE); expect(r.cors).toBe('https://mbaker40.github.io');
    }
  });
  it('the real parts are real: /submit runs the check, /daily serves the game\'s rule, /claim checks the name', async () => {
    expect((await call('POST', '/submit', { kind: 'sun', seconds: 100, clicks: 100 })).body).toMatchObject({ flagged: true, board: 'Suspicious Goop' });
    const d = (await call('GET', '/daily')).body;
    expect({ date: d.date, seed: d.seed, mutator: d.mutator }).toEqual((({ date, seed, mutator }) => ({ date, seed, mutator }))(localDaily()));
    expect((await call('POST', '/claim', { name: 'x' })).status).toBe(400);
    expect((await call('GET', '/board/nope')).status).toBe(404);
    expect((await call('GET', '/nowhere')).status).toBe(404);
    expect((await handle(new Request('https://w.example/claim', { method: 'OPTIONS' }))).status).toBe(204);
  });
});

// The leaderboard Worker's pure parts, in Node: no Miniflare, no deploy. See worker/README.md.
import { describe, it, expect } from 'vitest';
import { checkRun, summaryProblem, startState, TOLERANCE } from '../worker/src/plausible.js';
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

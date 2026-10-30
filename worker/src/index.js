/* Feed the Goop leaderboard Worker: thin route handlers over D1 and KV. NOT DEPLOYED. Every route
   answers with a clearly marked stub (`stub: true`) except two pieces that are already real: the
   plausibility check behind POST /submit (./plausible.js, the game's own rules) and the daily rule
   behind GET /daily (the same function the game falls back to). See worker/README.md for the plan. */
import { checkRun } from './plausible.js';
import { validateName } from '../../src/platform/identity.js';
import { BOARD_KINDS } from '../../src/platform/scores.js';
import { localDaily } from '../../src/daily.js';

export const STUB_NOTE = 'Stub: the Feed the Goop Worker is not deployed yet. Nothing was stored.';
const cors = env => ({ 'access-control-allow-origin': (env && env.ALLOWED_ORIGIN) || '*', 'access-control-allow-methods': 'GET, POST, OPTIONS', 'access-control-allow-headers': 'content-type, authorization', vary: 'origin' });
const json = (env, body, status = 200, extra = {}) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', ...cors(env), ...extra } });
const stub = (env, body, status = 200) => json(env, { stub: true, note: STUB_NOTE, ...body }, status);
async function body(req) { try { return await req.json(); } catch (e) { return null; } }

export const ROUTES = [
  // POST /claim { name } -> { name, token, recovery }. Later: insert into players (name unique, a numeric
  // suffix if taken), store SHA-256 hashes of a random token and a recovery phrase, rate limit per IP in KV.
  ['POST', /^\/claim$/, async (req, env) => {
    const b = await body(req), v = validateName(b && b.name);
    if (!v.ok) return json(env, { error: v.reason }, 400);
    return stub(env, { name: v.name, token: null, recovery: null });
  }],
  // POST /submit { kind, value, key, seconds, clicks, events, asc, perks, bangs, mutator } with a bearer
  // token -> { rank, flagged }. The check is real; storing the run (and ranking it) is the stub.
  ['POST', /^\/submit$/, async (req, env) => {
    const b = await body(req);
    if (!b) return json(env, { error: 'Send a JSON run summary.' }, 400);
    if (b.kind === 'week' || b.kind === 'bigbangs') return stub(env, { kind: b.kind, flagged: false, rank: null });
    const r = checkRun(b);
    return stub(env, { kind: b.kind, flagged: r.flagged, reason: r.reason, floor: r.floor, rank: null, board: r.flagged ? 'Suspicious Goop' : b.kind });
  }],
  // GET /board/:kind?key= -> { entries: [{ rank, name, value, flagged }] }, top 100, cached 60 s at the edge.
  ['GET', /^\/board\/([a-z]+)$/, async (req, env, m) => {
    if (!BOARD_KINDS.includes(m[1])) return json(env, { error: 'No such board.' }, 404);
    return stub(env, { kind: m[1], key: new URL(req.url).searchParams.get('key'), entries: [] });
  }],
  // GET /profile/:name -> { name, badges, stats, ranks }.
  ['GET', /^\/profile\/([^/]{1,64})$/, async (req, env, m) => stub(env, { name: decodeURIComponent(m[1]), badges: [], stats: {}, ranks: {} }, 404)],
  // GET /daily -> { date, seed, mutator }: the game's own date rule. Later: a daily row in D1 can pin a day.
  ['GET', /^\/daily$/, async (req, env) => stub(env, localDaily())],
  // GET /og/:name.png -> a 1200x630 link-preview image of the player's share card (share.js model).
  ['GET', /^\/og\/([^/]{1,64})\.png$/, async (req, env, m) => stub(env, { name: decodeURIComponent(m[1]), image: null }, 501)],
];

export async function handle(req, env = {}) {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(env) });
  const path = new URL(req.url).pathname.replace(/\/+$/, '') || '/';
  for (const [method, re, fn] of ROUTES) {
    const m = path.match(re);
    if (m && req.method === method) return fn(req, env, m);
  }
  return json(env, { error: 'Not found.' }, 404);
}
export default { fetch: (req, env) => handle(req, env) };

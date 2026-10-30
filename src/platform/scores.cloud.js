/* Cloud scores: the local provider (still the source of your own records, still saved in the save) plus
   the Worker. A best is POSTed to /submit as a compact run summary; boards come from GET /board/:kind.
   Every network failure is quiet: the panel falls back to your local records, and nothing is retried
   in a loop. Selected only when cloud is enabled (see config.js); not used by the default build. */
import { createLocalScores, localBoard, BOARDS } from './scores.js';
import { fetchJson } from './net.js';

export const OFFLINE_NOTE = 'The online boards cannot be reached right now. These are your own records.';
// The run summary the Worker's plausibility check reads (worker/src/plausible.js).
export function runSummary(kind, value, run = {}) {
  return { kind, value, key: run.key || null, seconds: run.seconds == null ? value : run.seconds, clicks: run.clicks | 0, events: run.events || {}, asc: run.asc | 0, perks: run.perks || {}, bangs: run.bangs | 0, ...(run.mutator ? { mutator: run.mutator } : {}), stage: run.stage | 0 };
}
// A server board, mapped onto the panel's shape. Your own row is marked by name.
export function fromServer(json, kind, name) {
  if (!json || !Array.isArray(json.entries)) return null;
  return {
    kind, title: BOARDS[kind] ? BOARDS[kind].name : kind, unit: BOARDS[kind] && BOARDS[kind].unit, source: 'cloud', note: json.note || '',
    entries: json.entries.slice(0, 100).map((e, i) => ({ rank: e.rank || i + 1, name: String(e.name || '?').slice(0, 24), value: +e.value, label: e.flagged ? 'Suspicious Goop' : '', you: e.name === name, current: e.name === name })),
  };
}
export function createCloudScores(api, { local = createLocalScores(), token = () => null, fetchImpl } = {}) {
  return {
    ...local,
    kind: 'cloud',
    submit(kind, value, key, run) {
      const r = local.submit(kind, value, key);
      if (r.improved && token()) fetchJson(api, '/submit', { method: 'POST', token: token(), body: runSummary(kind, value, { ...run, key }), fetchImpl });
      return r;
    },
    async board(kind, ctx = {}) {
      const json = await fetchJson(api, '/board/' + encodeURIComponent(kind) + (ctx.key ? '?key=' + encodeURIComponent(ctx.key) : ''), { fetchImpl });
      return fromServer(json, kind, ctx.name) || { ...localBoard(local.all(), kind, ctx), note: OFFLINE_NOTE };
    },
  };
}

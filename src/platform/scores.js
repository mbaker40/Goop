/* Scores adapter: where results are posted. Interface:
     load(map), all() -> map                    the records, persisted inside the save
     submit(kind, value, key?) -> { best, improved }   a time or a count; keeps the best
     add(kind, n, key?) -> total                 a running sum (the weekly slop board)
     best(kind, key?)
     board(kind, ctx) -> Promise<{ kind, title, entries: [{ rank, name, value, label, you }], source, note }>
   The five board kinds are the design's: fastest to the Sun, fastest to the universe, most slop this
   week, today's daily and most Big Bangs. A keyed board (week, daily) keeps one record per key
   ('week:2026-10-26', 'daily:2026-10-30').

   web (today): local personal bests, persisted inside the save. board() lists your own records, in the
   same shape a server board will have, so the Personal Bests panel draws either with no change.
   cloud: scores.cloud.js wraps this one and also talks to the Worker. steam: scores.steam.js. */
export const BOARDS = {
  sun:      { name: 'Fastest to the Sun', lower: true, unit: 'time' },          // seconds of play in one run
  universe: { name: 'Fastest to the universe', lower: true, unit: 'time' },     // seconds of play in one run, to Eat the Rest
  week:     { name: 'Most slop this week', lower: false, unit: 'slop', keyed: 'week', sum: true, keep: 8 },
  daily:    { name: 'Today\'s daily goop', lower: true, unit: 'time', keyed: 'date', keep: 30 },
  bigbangs: { name: 'Most Big Bangs', lower: false, unit: 'count' },
  // kept from phase 1: not boards in the design, but still personal bests in the lab notebook
  hops: { name: 'Most hops', lower: false, unit: 'count' },
  peak: { name: 'Peak slop per second', lower: false, unit: 'slop' },
};
export const BOARD_KINDS = ['sun', 'universe', 'week', 'daily', 'bigbangs'];
export const LOCAL_NOTE = 'These are your own records, kept in this browser. Online boards arrive later.';
const id = (kind, key) => (BOARDS[kind] && BOARDS[kind].keyed ? kind + ':' + key : kind);

// Keyed records for a kind, newest key first: [[key, value]].
export function keyedRecords(bests, kind) {
  return Object.entries(bests).filter(([k]) => k.startsWith(kind + ':')).map(([k, v]) => [k.slice(kind.length + 1), v]).sort((a, b) => (a[0] < b[0] ? 1 : -1));
}
function prune(bests, kind) {
  const b = BOARDS[kind];
  if (!b.keyed) return;
  for (const [k] of keyedRecords(bests, kind).slice(b.keep)) delete bests[kind + ':' + k];
}

// The local board: your own records as a ranked list. ctx: { name, key } (key: the week or date to lead with).
export function localBoard(bests, kind, ctx = {}) {
  const b = BOARDS[kind], name = ctx.name || 'You';
  if (!b) return { kind, title: kind, entries: [], source: 'local', note: LOCAL_NOTE };
  let entries;
  if (b.keyed) {
    entries = keyedRecords(bests, kind).map(([key, value]) => ({ name, value, label: key, you: true, current: key === ctx.key }));
    entries.sort((x, y) => (y.current - x.current) || (b.lower ? x.value - y.value : y.value - x.value));
  } else entries = bests[kind] != null ? [{ name, value: bests[kind], label: '', you: true, current: true }] : [];
  return { kind, title: b.name, unit: b.unit, entries: entries.map((e, i) => ({ rank: i + 1, ...e })), source: 'local', note: LOCAL_NOTE };
}

export function createLocalScores() {
  let bests = {};
  return {
    kind: 'local',
    load(map) { bests = { ...(map || {}) }; },
    submit(kind, value, key) {
      const b = BOARDS[kind];
      if (!b || !Number.isFinite(value) || (b.keyed && !key)) return { best: undefined, improved: false };
      const k = id(kind, key), old = bests[k];
      const improved = old == null || (b.lower ? value < old : value > old);
      if (improved) { bests[k] = value; prune(bests, kind); }
      return { best: bests[k], improved };
    },
    add(kind, n, key) {
      const b = BOARDS[kind];
      if (!b || !b.sum || !(n > 0) || !Number.isFinite(n) || (b.keyed && !key)) return this.best(kind, key) || 0;
      const k = id(kind, key);
      bests[k] = (bests[k] || 0) + n; prune(bests, kind);
      return bests[k];
    },
    best(kind, key) { return bests[id(kind, key)]; },
    all() { return { ...bests }; },
    board(kind, ctx) { return Promise.resolve(localBoard(bests, kind, ctx)); },
  };
}

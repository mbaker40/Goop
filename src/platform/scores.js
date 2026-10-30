/* Scores adapter: where results are posted. Interface: load(map), submit(board, value) -> { best,
   improved }, best(board), all() -> map.

   web (today): local personal bests, persisted inside the save.
   TODO(cloud): a provider that also POSTs a compact run summary to the Cloudflare Worker (/submit) and
   reads /board/:kind, failing quietly offline. TODO(steam): mirror the Worker's boards to Steam
   leaderboards through steamworks.js. */
export const BOARDS = {
  sun: { name: 'Fastest to the Sun', lower: true },     // seconds of play in one run
  hops: { name: 'Most hops', lower: false },
  peak: { name: 'Peak slop per second', lower: false },
};
export function createLocalScores() {
  let bests = {};
  return {
    kind: 'local',
    load(map) { bests = { ...(map || {}) }; },
    submit(board, value) {
      const b = BOARDS[board];
      if (!b || !Number.isFinite(value)) return { best: bests[board], improved: false };
      const old = bests[board];
      const improved = old == null || (b.lower ? value < old : value > old);
      if (improved) bests[board] = value;
      return { best: bests[board], improved };
    },
    best(board) { return bests[board]; },
    all() { return { ...bests }; },
  };
}

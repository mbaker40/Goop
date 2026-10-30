/* Steam scores: local personal bests plus a post to a Steam leaderboard through the bridge. The design
   keeps the Worker as the source of truth for boards once it exists; Steam's boards mirror it. Until
   then this posts your own bests so the Steam overlay has something to show. No bridge: a no-op. */
import { createLocalScores } from './scores.js';

// Steam leaderboard names, by board kind. Only the five design boards are mirrored.
export const STEAM_BOARDS = { sun: 'fastest_sun', universe: 'fastest_universe', week: 'most_slop_week', daily: 'daily_goop', bigbangs: 'most_big_bangs' };
export function createSteamScores(bridge, local = createLocalScores()) {
  const post = (kind, value, key) => { try { if (STEAM_BOARDS[kind] && bridge && typeof bridge.postScore === 'function') bridge.postScore(STEAM_BOARDS[kind], value, key || null); } catch (e) { /* Steam is optional */ } };
  return {
    ...local,
    kind: 'steam',
    submit(kind, value, key, run) { const r = local.submit(kind, value, key, run); if (r.improved) post(kind, kind === 'sun' || kind === 'universe' || kind === 'daily' ? Math.round(value) : value, key); return r; },
  };
}

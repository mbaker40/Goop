/* What the share card says. Pure, no DOM: sharecard.js draws it, the tests check it, and the Worker's
   link-preview image (GET /og/:name.png) can use the same model later. */
import { STAGES, LAST } from './econ.js';
import { SUN, UNIVERSE, knownTime } from './stats.js';
import { BADGES, BADGE_BY_ID } from './achievements.js';
import { clock } from './fmt.js';

export const GAME_URL = 'https://mbaker40.github.io/Goop/';

// The furthest the goop has ever got: the current stage, any stage with a best time, or the end of the
// universe. Its avatar is the goop as it looked there.
export function furthestStage(state, stats) {
  let k = state ? state.stage : 0;
  const best = (stats && stats.bestStageAt) || [];
  for (let i = 0; i < STAGES.length; i++) if (best[i] != null) k = Math.max(k, i);
  const universe = !!((stats && stats.universes > 0) || (state && state.ate) || best[UNIVERSE] != null);
  return { stage: universe ? LAST : k, universe };
}

// badges: the achievements adapter's earned map { id: earnedAt }. Newest badges first on the card.
export function shareModel({ state, stats, badges = {}, name = 'The Scientist', url = GAME_URL, max = 11 }) {
  const { stage, universe } = furthestStage(state, stats);
  const best = (stats && stats.bestStageAt) || [];
  const ids = Object.keys(badges).filter(id => BADGE_BY_ID[id]).sort((a, b) => badges[b] - badges[a]);
  const sun = knownTime(best[SUN]) ? best[SUN] : null, uni = knownTime(best[UNIVERSE]) ? best[UNIVERSE] : null;
  const rows = [['Time to the Sun', sun != null ? clock(sun) : 'not yet']];
  if (uni != null) rows.push(['Time to the universe', clock(uni)]);
  rows.push(['Hops', String((stats && stats.hops) || 0)]);
  if (stats && stats.bigBangs) rows.push(['Big Bangs', String(stats.bigBangs)]);
  rows.push(['Badges', ids.length + ' of ' + BADGES.length]);
  return {
    name, stage, universe, url,
    title: universe ? 'Ate the universe' : 'Stage ' + (stage + 1) + ' of ' + STAGES.length + ': ' + STAGES[stage].name,
    sun, universeTime: uni, hops: (stats && stats.hops) || 0, badgeCount: ids.length, badgeTotal: BADGES.length,
    badges: ids.slice(0, max), more: Math.max(0, ids.length - max), rows,
    text: name + '\'s goop: ' + (universe ? 'ate the universe' : 'reached ' + STAGES[stage].name) + (sun != null ? ', ate the Sun in ' + clock(sun) : '') + '. Feed the Goop: ' + url,
  };
}
// The file name for a saved card.
export function shareFileName(name) { return 'goop-' + (String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'card') + '.png'; }

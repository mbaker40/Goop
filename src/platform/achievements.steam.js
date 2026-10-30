/* Steam achievements: the local trophy shelf (still saved in the save, still the source of truth) plus a
   call to the bridge on every new badge, which the desktop main process turns into a Steamworks
   achievement. Badge ids map one to one onto Steam achievement API names. No bridge, or no Steam: the
   call is a no-op and the shelf works as on the web. */
import { createLocalAchievements } from './achievements.js';

export function createSteamAchievements(bridge, local = createLocalAchievements()) {
  const call = id => { try { if (bridge && typeof bridge.unlockAchievement === 'function') bridge.unlockAchievement(id); } catch (e) { /* Steam is optional */ } };
  return {
    ...local,
    kind: 'steam',
    load(map) { local.load(map); for (const id of Object.keys(local.earned())) call(id); },   // re-sync: Steam ignores repeats
    unlock(id, at) { const fresh = local.unlock(id, at); if (fresh) call(id); return fresh; },
  };
}

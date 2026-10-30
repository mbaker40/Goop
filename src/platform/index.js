/* Platform adapters. The game imports only `platform` and talks to these interfaces; which providers
   sit behind them is decided here, once, at boot (config.js says how).

     storage       web: localStorage                 steam: a file per key, Auto-Cloud
     achievements  web: the local shelf              steam: also Steamworks achievements
     scores        web: local bests                  cloud: also the Worker's boards   steam: also Steam boards
     identity      web: a local name                 cloud: also /claim for a token
     daily         web: the UTC date rule            cloud: GET /daily, falling back to the date rule

   The default build ships the local providers and works fully offline; cloud is off unless a build flag
   or a URL flag turns it on, and steam only exists inside the desktop wrapper (desktop/). */
import { createLocalStorage } from './storage.js';
import { createLocalAchievements } from './achievements.js';
import { createLocalScores } from './scores.js';
import { createLocalIdentity } from './identity.js';
import { createLocalDaily, createCloudDaily } from './daily.js';
import { createCloudScores } from './scores.cloud.js';
import { createCloudIdentity } from './identity.cloud.js';
import { createSteamStorage } from './storage.steam.js';
import { createSteamAchievements } from './achievements.steam.js';
import { createSteamScores } from './scores.steam.js';
import { cloudConfig, hostOf } from './config.js';

export function createPlatform({ win = typeof window !== 'undefined' ? window : null, env = {}, search = '' } = {}) {
  const host = hostOf(win), cloud = cloudConfig(env, search), bridge = host === 'steam' ? win.goopDesktop : null;
  const identity = cloud.enabled ? createCloudIdentity(cloud.api) : createLocalIdentity();
  const token = () => (identity.token ? identity.token() : null);
  let scores = cloud.enabled ? createCloudScores(cloud.api, { token }) : createLocalScores();
  if (bridge) scores = createSteamScores(bridge, scores);
  return {
    host, cloud,
    storage: bridge ? createSteamStorage(bridge) : createLocalStorage(),
    achievements: bridge ? createSteamAchievements(bridge) : createLocalAchievements(),
    scores, identity,
    daily: cloud.enabled ? createCloudDaily(cloud.api) : createLocalDaily(),
  };
}

const env = (typeof import.meta !== 'undefined' && import.meta.env) || {};
export const platform = createPlatform({ env, search: typeof location !== 'undefined' ? location.search : '' });

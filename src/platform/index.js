/* Platform adapters. The game imports only `platform` and talks to these four interfaces; which
   providers sit behind them is decided here, once, at boot.

   Today every build ships the local providers and works fully offline.
   TODO(cloud, phase 3): when a Worker URL is configured, swap in providers that also talk to the
   Cloudflare Worker for scores and identity. TODO(steam, phase 5): the Electron wrapper in desktop/
   sets window.goopHost = 'steam' and providers here wrap the local ones with steamworks.js calls. */
import { createLocalStorage } from './storage.js';
import { createLocalAchievements } from './achievements.js';
import { createLocalScores } from './scores.js';
import { createLocalIdentity } from './identity.js';

function detectHost() {
  try { return (typeof window !== 'undefined' && window.goopHost) || 'web'; } catch (e) { return 'web'; }
}

export function createPlatform(host = detectHost()) {
  // Only 'web' exists so far; other hosts fall back to it until their providers land.
  return {
    host,
    storage: createLocalStorage(),
    achievements: createLocalAchievements(),
    scores: createLocalScores(),
    identity: createLocalIdentity(),
  };
}

export const platform = createPlatform();

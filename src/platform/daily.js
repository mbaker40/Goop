/* Where today's daily goop comes from. Local: the date rule in src/daily.js (works offline, same answer
   on every device). Cloud: GET /daily from the Worker, which serves the same rule but could pin a
   mutator; anything wrong with the answer, or no answer, falls back to the local rule. */
import { localDaily, dailyFrom } from '../daily.js';
import { fetchJson } from './net.js';

export function createLocalDaily(now = () => Date.now()) {
  return { kind: 'local', today: () => Promise.resolve(localDaily(now())), todayNow: () => localDaily(now()) };
}
export function createCloudDaily(api, { fetchImpl, now = () => Date.now() } = {}) {
  return {
    kind: 'cloud',
    async today() { return dailyFrom(await fetchJson(api, '/daily', { fetchImpl, timeout: 2500 }), now()); },
    todayNow: () => localDaily(now()),
  };
}

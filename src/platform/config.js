/* Which providers to use, decided once at boot. Pure: the build-time env and the page's URL are passed in.

   Cloud (the Worker's boards, names and daily seed) is OFF by default. It turns on only when:
     - the build sets VITE_GOOP_CLOUD=1 (and VITE_GOOP_API to the Worker's URL), or
     - the page is opened with ?cloud=1 (and optionally ?api=https://…) for testing a Worker.
   Steam is on when the desktop wrapper's preload has set window.goopHost = 'steam' and exposed the
   goopDesktop bridge. Everything else is the plain web build: local providers only. */
export const DEFAULT_API = '';
const okApi = a => typeof a === 'string' && /^(https?:\/\/[^\s]+|\/[^\s]*)$/.test(a);
export function cloudConfig(env = {}, search = '') {
  const q = new URLSearchParams(search || '');
  const flag = q.get('cloud') === '1' || env.VITE_GOOP_CLOUD === '1' || env.VITE_GOOP_CLOUD === 'true';
  const api = [q.get('api'), env.VITE_GOOP_API, DEFAULT_API].find(okApi) || '';
  return { enabled: !!(flag && api), api: api.replace(/\/$/, '') };
}
export function hostOf(win) {
  try { return (win && win.goopHost === 'steam' && win.goopDesktop) ? 'steam' : 'web'; } catch (e) { return 'web'; }
}

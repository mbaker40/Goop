/* Install and update. Production builds register sw.js (built by scripts/sw-plugin.js): it precaches the
   game so it loads offline, and serves the page network-first so an online player always gets the newest
   build on a reload. A new build found while the game is open waits; the page shows a small "new version"
   toast, and Reload hands over to it (skipWaiting) and reloads. Nobody is stranded on a stale build:
   the next visit or a tap on Reload moves them on, and the save is written on the way out. */
export function initPwa({ onUpdate = () => {}, onInstallable = () => {} } = {}) {
  let deferred = null;
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; onInstallable(true); });
  window.addEventListener('appinstalled', () => { deferred = null; onInstallable(false); });
  const install = async () => {
    if (!deferred) return false;
    const d = deferred; deferred = null; onInstallable(false);
    try { d.prompt(); const c = await d.userChoice; return c && c.outcome === 'accepted'; } catch (e) { return false; }
  };
  // Not in development, not from a file (the desktop wrapper), not where there are no service workers.
  if (!import.meta.env.PROD || !('serviceWorker' in navigator) || location.protocol === 'file:' || window.goopHost === 'steam') return { install, registered: Promise.resolve(null) };
  let reloading = false, asked = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (asked && !reloading) { reloading = true; location.reload(); } });
  const registered = navigator.serviceWorker.register('./sw.js').then(reg => {
    const waiting = w => { if (w && navigator.serviceWorker.controller) onUpdate(() => { asked = true; w.postMessage({ type: 'SKIP_WAITING' }); }); };
    if (reg.waiting) waiting(reg.waiting);
    reg.addEventListener('updatefound', () => { const w = reg.installing; if (w) w.addEventListener('statechange', () => { if (w.state === 'installed') waiting(w); }); });
    // a tab left open for days still hears about new builds: check when it comes back to the front
    document.addEventListener('visibilitychange', () => { if (!document.hidden) reg.update().catch(() => {}); });
    return reg;
  }).catch(() => null);
  return { install, registered };
}

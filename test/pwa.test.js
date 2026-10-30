import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import vm from 'node:vm';
import { precacheList, swSource, buildVersion, listFiles } from '../scripts/sw-plugin.js';
import { offerUpdates } from '../src/pwa.js';

// Run the built worker's source against fakes: the listeners it adds, and what install puts in the cache.
function loadWorker(files) {
  const on = {}, added = [];
  const cache = { addAll: async reqs => { added.push(...reqs); } };
  const self = { addEventListener: (t, f) => { on[t] = f; }, location: { origin: 'https://example.test' } };
  // a worker resolves relative URLs against its own location, as Node's Request does not
  const WorkerRequest = class extends Request { constructor(u, o) { super(typeof u === 'string' ? new URL(u, 'https://example.test/Goop/sw.js') : u, o); } };
  vm.runInNewContext(swSource(readFileSync('src/sw.js', 'utf8'), files, 'v1'), { self, caches: { open: async () => cache }, Request: WorkerRequest, URL, Response, fetch: () => Promise.reject(new Error('offline')) });
  return { on, added };
}
const fakeTarget = () => { const ls = {}; return { ls, addEventListener: (t, f) => { (ls[t] = ls[t] || []).push(f); }, fire: t => (ls[t] || []).forEach(f => f()) }; };

describe('the service worker build', () => {
  it('precaches the build output and public/, without itself, maps or dotfiles', () => {
    expect(precacheList(['index.html', 'assets/a-1.js', 'assets/a-1.js.map', 'sw.js'], ['icons/icon-192.png', '.DS_Store', 'icons\\icon-512.png', 'manifest.webmanifest']))
      .toEqual(['assets/a-1.js', 'icons/icon-192.png', 'icons/icon-512.png', 'index.html', 'manifest.webmanifest']);
  });
  it('fills in the template; a different build gets a different cache', () => {
    const src = swSource(readFileSync('src/sw.js', 'utf8'), ['index.html'], 'abc123');
    expect(src).toContain("const VERSION = 'abc123'"); expect(src).toContain('const PRECACHE = ["index.html"]');
    expect(src).not.toMatch(/skipWaiting\(\);\s*\}\);\s*self\.addEventListener\('activate'/);   // install does not skip waiting
    expect(buildVersion(['a.js'], '<html>1')).not.toBe(buildVersion(['a.js'], '<html>2'));
    expect(buildVersion(['a.js'], '<html>', 'sw 1')).not.toBe(buildVersion(['a.js'], '<html>', 'sw 2'));   // a fix to the worker alone is a new build
    expect(src).toContain('ignoreVary: true');     // a "Vary: Origin" response must still serve module scripts offline
  });
  it('the manifest names the icons, and the icons are committed at the standard sizes', () => {
    const m = JSON.parse(readFileSync('public/manifest.webmanifest', 'utf8'));
    expect(m.start_url).toBe('./'); expect(m.display).toBe('standalone'); expect(m.theme_color).toBe('#2b2150');
    for (const i of m.icons) expect(existsSync('public/' + i.src), i.src).toBe(true);
    expect(m.icons.some(i => i.purpose === 'maskable' && i.sizes === '512x512')).toBe(true);
    expect(listFiles('public')).toEqual(expect.arrayContaining(['icons/apple-touch-icon.png', 'icons/favicon-32.png']));
    const html = readFileSync('index.html', 'utf8');
    expect(html).toContain('rel="manifest"'); expect(html).toContain('name="theme-color"'); expect(html).toContain('rel="apple-touch-icon"');
  });
});

describe('the service worker at run time (fakes, no browser)', () => {
  it('install precaches past the HTTP cache, so a new build never stores the previous build\'s page', async () => {
    const { on, added } = loadWorker(['assets/index-abc.js', 'index.html']);
    let done; on.install({ waitUntil: p => { done = p; } }); await done;
    expect(added.map(r => r.url)).toEqual(['https://example.test/Goop/assets/index-abc.js', 'https://example.test/Goop/index.html']);
    for (const r of added) expect(r.cache).toBe('reload');
  });
});

describe('offering a new build', () => {
  const worker = () => { const w = { ...fakeTarget(), state: 'installing', posted: [] }; w.postMessage = m => w.posted.push(m); return w; };
  it('a worker already waiting at registration is offered, even on an uncontrolled page', () => {
    const w = worker(), reg = { ...fakeTarget(), waiting: w, active: {} }, sw = { ...fakeTarget(), controller: null };
    let apply = null, reloads = 0, timer = null;
    offerUpdates(reg, sw, a => { apply = a; }, () => reloads++, f => { timer = f; });
    expect(apply).toBeTypeOf('function');
    apply(); expect(w.posted).toEqual([{ type: 'SKIP_WAITING' }]);
    sw.fire('controllerchange'); expect(reloads).toBe(1);
    timer(); expect(reloads).toBe(1);                      // the fallback never reloads twice
  });
  it('the fallback reloads if the hand-over never reports back', () => {
    const w = worker(), reg = { ...fakeTarget(), waiting: w }, sw = { ...fakeTarget(), controller: {} };
    let apply, reloads = 0, timer;
    offerUpdates(reg, sw, a => { apply = a; }, () => reloads++, f => { timer = f; });
    apply(); timer(); expect(reloads).toBe(1);
  });
  it('a build installed while playing is offered when there is one to replace; a first install is not', () => {
    for (const [controller, active, offered] of [[{}, {}, true], [null, null, false]]) {
      const w = worker(), reg = { ...fakeTarget(), waiting: null, installing: w, active }, sw = { ...fakeTarget(), controller };
      let apply = null;
      offerUpdates(reg, sw, a => { apply = a; }, () => {});
      reg.fire('updatefound'); w.state = 'installed'; w.fire('statechange');
      expect(!!apply).toBe(offered);
      sw.fire('controllerchange');                         // a first install claiming the page never reloads it
    }
  });
});

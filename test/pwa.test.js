import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { precacheList, swSource, buildVersion, listFiles } from '../scripts/sw-plugin.js';

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

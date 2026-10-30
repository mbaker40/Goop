// Vite plugin: writes dist/sw.js from src/sw.js with this build's version and precache list (every file
// Vite emitted plus everything in public/). No dependency: a dozen lines instead of a PWA framework.
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { createHash } from 'node:crypto';

// The files to precache: the build's output and public/, as relative URLs, sorted, without sw.js itself,
// source maps or dotfiles. index.html stands in for the page.
export function precacheList(bundleFiles, publicFiles = []) {
  const out = new Set();
  for (const f of [...bundleFiles, ...publicFiles]) {
    const p = f.replace(/\\/g, '/').replace(/^\.?\//, '');
    if (!p || p === 'sw.js' || p.endsWith('.map') || p.split('/').some(s => s.startsWith('.'))) continue;
    out.add(p);
  }
  return [...out].sort();
}
export function buildVersion(files, html = '') { return createHash('sha256').update(files.join('\n') + '\n' + html).digest('hex').slice(0, 12); }
export function swSource(template, files, version) {
  return template.replace('__VERSION__', version).replace('__PRECACHE__', JSON.stringify(files));
}
export function listFiles(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  const walk = d => { for (const n of readdirSync(d)) { const p = join(d, n); if (statSync(p).isDirectory()) walk(p); else out.push(relative(dir, p)); } };
  walk(dir);
  return out;
}
export default function serviceWorker({ template = 'src/sw.js', publicDir = 'public' } = {}) {
  return {
    name: 'goop-service-worker',
    apply: 'build',
    enforce: 'post',
    generateBundle(_, bundle) {
      const files = precacheList(Object.keys(bundle), listFiles(publicDir));
      const html = bundle['index.html'] ? String(bundle['index.html'].source) : '';
      this.emitFile({ type: 'asset', fileName: 'sw.js', source: swSource(readFileSync(template, 'utf8'), files, buildVersion(files, html)) });
    },
  };
}

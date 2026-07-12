import { defineConfig } from 'vite';
import { execSync } from 'node:child_process';

// Build stamp: short git SHA + build time, injected as __BUILD_ID__ so the running bundle can show
// exactly which version it is (a cache-buster diagnostic — a stale bundle shows an old stamp).
function buildId(): string {
  let sha = 'nogit';
  try {
    sha = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
  } catch {
    /* not a git checkout — fall back */
  }
  const now = new Date();
  const stamp = `${now.getUTCMonth() + 1}/${now.getUTCDate()} ${String(now.getUTCHours()).padStart(2, '0')}:${String(now.getUTCMinutes()).padStart(2, '0')}`;
  return `${sha} · ${stamp}Z`;
}

export default defineConfig({
  root: '.',
  define: {
    __BUILD_ID__: JSON.stringify(buildId()),
  },
  // Relative base so the built SPA works when served from a GitHub Pages project
  // subpath (https://<user>.github.io/<repo>/) as well as from '/' locally.
  base: './',
  build: {
    target: 'es2022',
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        // three.js is ~half the bundle and changes only on dependency bumps — its own chunk keeps
        // it long-term-cacheable and shrinks the app chunk browsers must re-fetch per deploy.
        manualChunks: { three: ['three'] },
      },
    },
  },
  server: {
    port: 5173,
    host: true,
  },
});

import { defineConfig } from 'vite';
import serviceWorker from './scripts/sw-plugin.js';

// base './' keeps every asset path relative, so the same build works at mbaker40.github.io/Goop/,
// at a custom domain root, or opened from the desktop wrapper in desktop/.
// The service worker plugin writes dist/sw.js (offline play and the "new version" toast); see src/pwa.js.
export default defineConfig({
  base: './',
  plugins: [serviceWorker()],
  build: { outDir: 'dist', emptyOutDir: true, target: 'es2019' },
  test: { environment: 'node', include: ['test/**/*.test.js'] },
});

import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  // Relative base so the built SPA works when served from a GitHub Pages project
  // subpath (https://<user>.github.io/<repo>/) as well as from '/' locally.
  base: './',
  build: {
    target: 'es2022',
    outDir: 'dist',
    sourcemap: true,
  },
  server: {
    port: 5173,
    host: true,
  },
});

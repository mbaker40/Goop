import { defineConfig } from 'vite';

// base './' keeps every asset path relative, so the same build works at mbaker40.github.io/Goop/,
// at a custom domain root, or opened from a desktop wrapper later.
export default defineConfig({
  base: './',
  build: { outDir: 'dist', emptyOutDir: true, target: 'es2019' },
  test: { environment: 'node', include: ['test/**/*.test.js'] },
});

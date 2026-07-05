import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts', 'src/**/*.test.ts'],
    // Balance acceptance tests simulate long runs at high speed; give them room.
    testTimeout: 30_000,
  },
});

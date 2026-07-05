/* eslint-env node */
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  env: { browser: true, es2022: true, node: true },
  ignorePatterns: ['dist', 'node_modules', '*.cjs'],
  rules: {
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'warn',
  },
  overrides: [
    {
      // ARCHITECTURE INVARIANT (PLAN §10): src/sim must be pure & framework-free.
      // No three.js, no renderer/UI/save imports, no DOM/browser globals.
      files: ['src/sim/**/*.ts', 'src/config/**/*.ts'],
      excludedFiles: ['**/*.test.ts'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              { group: ['three', 'three/*'], message: 'sim/config must not import three.js (PLAN §10).' },
              { group: ['**/render/*', '**/ui/*', '**/save/*', '**/store'], message: 'sim/config must not depend on renderer/UI/save/store (PLAN §10).' },
            ],
          },
        ],
        'no-restricted-globals': [
          'error',
          { name: 'window', message: 'sim must be DOM-free (PLAN §10).' },
          { name: 'document', message: 'sim must be DOM-free (PLAN §10).' },
          { name: 'localStorage', message: 'sim must be DOM-free (PLAN §10).' },
        ],
      },
    },
  ],
};

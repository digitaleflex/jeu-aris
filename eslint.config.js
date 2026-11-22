import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['node_modules/', 'images/', 'docs/images/'] },
  js.configs.recommended,
  {
    // Code du jeu : s'exécute dans le navigateur
    files: ['src/**/*.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: { ...globals.browser },
    },
    rules: {
      'no-var': 'error',
      'prefer-const': 'error',
      eqeqeq: ['error', 'always'],
      'no-unused-vars': ['error', { args: 'after-used', argsIgnorePattern: '^_' }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  {
    // Outils et tests : s'exécutent dans Node
    files: ['scripts/**', 'tests/**', 'eslint.config.js'],
    ignores: ['tests/e2e/**', 'scripts/captures.mjs'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: { ...globals.node },
    },
    rules: {
      'no-var': 'error',
      'prefer-const': 'error',
      eqeqeq: ['error', 'always'],
    },
  },
  {
    // Tests de bout en bout et captures : Node, avec des fonctions exécutées
    // dans le navigateur par Playwright (page.evaluate)
    files: ['tests/e2e/**', 'scripts/captures.mjs'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: { ...globals.node, ...globals.browser },
    },
    rules: {
      'no-var': 'error',
      'prefer-const': 'error',
      eqeqeq: ['error', 'always'],
    },
  },
];

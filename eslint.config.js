import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/generated/**',
      '**/dist/**',
      '**/coverage/**',
      '**/playwright-report/**',
      '**/test-results/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      // `_name` marks a value discarded on purpose (e.g. omitting a field by destructuring).
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', destructuredArrayIgnorePattern: '^_' },
      ],
    },
  },
  {
    // Architecture boundary (ARCHITECTURE.md §1-2): the web app never imports game rules.
    files: ['apps/web/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@decabeca/engine', '@decabeca/engine/*'],
              message: 'apps/web must not import game rules; use @decabeca/contracts and the API.',
            },
            {
              group: ['**/packages/engine/**', '**/apps/api/**'],
              message: 'apps/web must not import engine or api sources.',
            },
          ],
        },
      ],
    },
  },
  {
    // engine and contracts never depend on apps (ARCHITECTURE.md §2).
    files: ['packages/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/apps/**', '@decabeca/api', '@decabeca/web'],
              message: 'packages must not import apps.',
            },
          ],
        },
      ],
    },
  },
);

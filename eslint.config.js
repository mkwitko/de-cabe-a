import js from '@eslint/js';
import tseslint from 'typescript-eslint';

// Modo Clube (MC-145, 01-ARQUITETURA.md §2): outside its package the match engine is
// used only through its root, which exports the contract and the simulate* functions.
const matchEngineRootOnly = {
  group: ['@decabeca/match-engine/*', '**/packages/match-engine/**'],
  message: 'Import @decabeca/match-engine from its root only.',
};
const noApps = {
  group: ['**/apps/**', '@decabeca/api', '@decabeca/web'],
  message: 'packages must not import apps.',
};

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
            matchEngineRootOnly,
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
          patterns: [noApps],
        },
      ],
    },
  },
  {
    files: ['packages/**'],
    ignores: ['packages/match-engine/**'],
    rules: { 'no-restricted-imports': ['error', { patterns: [noApps, matchEngineRootOnly] }] },
  },
  {
    // Modo Clube (ADR-017 item 4, MC-147): text the person reads comes from t(key).
    files: ['apps/web/src/games/manager/**/*.tsx'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'JSXText[value=/[A-Za-zÀ-ÖØ-öø-ÿ]/]',
          message: 'Modo Clube: no literal text in JSX; use t(key).',
        },
        {
          selector:
            ':matches(JSXElement, JSXFragment) > JSXExpressionContainer Literal[value=/[A-Za-zÀ-ÖØ-öø-ÿ]/]:not(CallExpression > Literal):not(CallExpression > ConditionalExpression > Literal):not(JSXAttribute Literal):not(BinaryExpression > Literal):not(ArrayExpression > Literal):not(MemberExpression Literal)',
          message: 'Modo Clube: no literal text in JSX; use t(key).',
        },
        {
          selector:
            'JSXAttribute[name.name=/^(aria-label|aria-description|title|alt|placeholder|label|description|message)$/] Literal[value=/[A-Za-zÀ-ÖØ-öø-ÿ]/]:not(CallExpression > Literal):not(CallExpression > ConditionalExpression > Literal)',
          message: 'Modo Clube: no literal text in attributes; use t(key).',
        },
      ],
    },
  },
  {
    // ADR-020: the career runs in the browser and is replayed on the server, so the engine and
    // the domain must give the same bits everywhere. Only + − × ÷ and sqrt are exact in every
    // JavaScript engine; exp, log, sin, atan, pow… differ between browsers (measured: Node 24 and
    // Chrome 156 already disagree). Offline calibration, tests and scripts are outside the game.
    files: ['packages/match-engine/src/**/*.ts', 'packages/club-domain/src/**/*.ts'],
    ignores: [
      '**/*.test.ts',
      'packages/match-engine/src/calibration/**',
      'packages/match-engine/src/bench.ts',
      'packages/club-domain/src/season/**',
    ],
    rules: {
      'no-restricted-properties': [
        'error',
        ...[
          'exp',
          'expm1',
          'log',
          'log1p',
          'log2',
          'log10',
          'pow',
          'sin',
          'cos',
          'tan',
          'asin',
          'acos',
          'atan',
          'atan2',
          'sinh',
          'cosh',
          'tanh',
          'asinh',
          'acosh',
          'atanh',
          'cbrt',
          'hypot',
        ].map((property) => ({
          object: 'Math',
          property,
          message: 'Not the same bits in every browser (ADR-020); use + − × ÷ and Math.sqrt.',
        })),
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: "BinaryExpression[operator='**']:not([right.raw=/^[0-9]+$/])",
          message: 'Only whole-number powers are exact everywhere (ADR-020).',
        },
      ],
    },
  },
  {
    files: ['apps/api/**'],
    rules: { 'no-restricted-imports': ['error', { patterns: [matchEngineRootOnly] }] },
  },
);

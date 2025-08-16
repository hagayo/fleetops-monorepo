/** Root ESLint config for the whole workspace */
module.exports = {
  root: true,
  env: { es2022: true, node: true },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    tsconfigRootDir: __dirname
  },
  plugins: ['@typescript-eslint', 'import'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    // Next app adds its own "next/core-web-vitals" in its local config
    'prettier'
  ],
  settings: {
    'import/resolver': {
      node: true,
      typescript: { project: ['./apps/*/tsconfig.json', './packages/*/tsconfig.json'] }
    }
  },
  rules: {
    'import/order': ['error', { groups: ['builtin','external','internal','parent','sibling','index','type'], 'newlines-between': 'always' }],

    // Prefer logger over console in Node services (you define a structured logger). :contentReference[oaicite:1]{index=1}
    'no-console': ['warn', { allow: ['warn', 'error'] }],

    // Solid TS hygiene that aligns with your strict TS guidance. :contentReference[oaicite:2]{index=2}
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'warn',
    'prefer-const': 'error'
  },
  ignorePatterns: [
    '**/node_modules/**',
    '**/dist/**',
    '**/.next/**',
    '**/coverage/**',
    '**/generated.ts'
  ]
};

/** ESLint for the Node API service */
module.exports = {
  env: { node: true, es2022: true },
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
    'prettier'
  ],
  rules: {
    // Use your structured logger, not console. :contentReference[oaicite:6]{index=6}
    'no-console': ['warn', { allow: ['warn', 'error'] }],

    // Import hygiene per standards. :contentReference[oaicite:7]{index=7}
    'import/order': ['error', {
      groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index', 'type'],
      'newlines-between': 'always'
    }],

    // TS hygiene that complements your strict tsconfig guidance. :contentReference[oaicite:8]{index=8}
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'warn',
    'prefer-const': 'error'
  }
};

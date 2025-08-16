/** ESLint for the Next.js app */
module.exports = {
  env: { browser: true, es2022: true },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    tsconfigRootDir: __dirname
  },
  plugins: ['@typescript-eslint', 'import'],
  extends: [
    'next/core-web-vitals',
    'plugin:@typescript-eslint/recommended',
    'prettier'
  ],
  rules: {
    // import hygiene
    'import/order': ['error', {
      groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index', 'type'],
      'newlines-between': 'always'
    }],

    // TS hygiene
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'warn',

    // use the base rule, not the TS plugin one
    'prefer-const': 'error'
  },
  overrides: [
    {
      files: ['**/*.d.ts', 'next-env.d.ts'],
      rules: {
        // do not lint generated or ambient declaration files
        all: 'off'
      }
    }
  ]
};

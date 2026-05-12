// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['**/dist/**', '**/node_modules/**', '**/*.d.ts'],
  },

  eslint.configs.recommended,

  ...tseslint.configs.recommendedTypeChecked,

  eslintPluginPrettierRecommended,

  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },

      sourceType: 'module',

      parserOptions: {
        project: ['./tsconfig.eslint.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  {
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: ['*/internal/*', '**/dist/**'],
        },
      ],

      '@typescript-eslint/no-explicit-any': 'warn',

      '@typescript-eslint/no-floating-promises': 'warn',

      '@typescript-eslint/no-unsafe-argument': 'warn',

      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],

      '@typescript-eslint/no-unsafe-function-type': 'warn',

      '@typescript-eslint/unbound-method': 'off',

      'prettier/prettier': 'error',
    },
  },
);

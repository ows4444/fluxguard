import eslint from '@eslint/js';
import boundaries from 'eslint-plugin-boundaries';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['**/dist/**', '**/node_modules/**', '**/*.d.ts'],
  },

  eslint.configs.recommended,

  ...tseslint.configs.recommendedTypeChecked,

  eslintPluginPrettierRecommended,

  {
    settings: {
      'boundaries/elements': [
        {
          type: 'contracts',
          pattern: 'packages/contracts/src/**',
        },

        {
          type: 'runtime',
          pattern: 'packages/runtime/src/**',
          mode: 'folder',
          capture: ['domain'],
        },

        {
          type: 'runtime-internal',
          pattern: 'packages/runtime/src/internal/**',
        },

        {
          type: 'nestjs',
          pattern: 'packages/nestjs/src/**',
        },
      ],
    },

    languageOptions: {
      globals: {
        ...globals.node,
      },

      sourceType: 'module',

      parserOptions: {
        project: ['./tsconfig.eslint.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  {
    plugins: {
      boundaries,
      'simple-import-sort': simpleImportSort,
    },

    rules: {
      'boundaries/element-types': [
        'error',
        {
          default: 'disallow',

          rules: [
            {
              from: 'contracts',
              allow: [],
            },

            {
              from: 'runtime',
              allow: ['contracts', 'runtime-internal', 'runtime'],
            },

            {
              from: 'runtime-internal',
              allow: ['contracts', 'runtime', 'runtime-internal'],
            },

            {
              from: 'nestjs',
              allow: ['runtime', 'contracts'],
            },
          ],
        },
      ],

      'simple-import-sort/imports': 'error',

      'simple-import-sort/exports': 'error',

      'no-restricted-imports': [
        'error',
        {
          patterns: [
            '@fluxguard/*/internal/*',

            '@fluxguard/runtime/*',

            '@fluxguard/contracts/*',

            '@fluxguard/nestjs/*',

            '**/dist/**',
          ],
        },
      ],

      '@typescript-eslint/no-explicit-any': 'warn',

      '@typescript-eslint/no-floating-promises': 'warn',

      '@typescript-eslint/no-unsafe-argument': 'warn',

      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
        },
      ],

      '@typescript-eslint/no-unsafe-function-type': 'warn',

      '@typescript-eslint/unbound-method': 'off',

      'prettier/prettier': 'error',
    },
  },
);

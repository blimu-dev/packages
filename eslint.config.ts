import { defineConfig } from 'eslint/config';
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettierConfig from 'eslint-config-prettier';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';

export default defineConfig(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  prettierConfig,
  eslintPluginPrettierRecommended,
  {
    files: ['**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/explicit-module-boundary-types': 'error',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          prefer: 'type-imports',
          fixStyle: 'separate-type-imports',
          // Allow regular imports for classes used in constructor parameters
          // This is necessary for NestJS dependency injection which requires
          // runtime class references for decorator metadata
          disallowTypeAnnotations: false,
        },
      ],
    },
  },
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.yarn/**',
      '**/coverage/**',
      '**/*.config.{js,mjs,ts}',
      '**/templates/**',
      '**/.changeset/**',
      '**/.tests/**',
      '**/generated-sdk/**',
      '**/.lintstagedrc.json',
      'scripts/**',
    ],
  },
  {
    // Disable consistent-type-imports for NestJS services and controllers
    // These files need regular imports for constructor dependency injection
    // to work properly with decorator metadata
    files: [
      '**/*.controller.ts',
      '**/*.decorator.ts',
      '**/*.service.ts',
      '**/*.module.ts',
      '**/*.guard.ts',
      '**/*.interceptor.ts',
      '**/*.filter.ts',
      '**/*.command.ts',
    ],
    rules: {
      '@typescript-eslint/consistent-type-imports': 'off',
    },
  }
);

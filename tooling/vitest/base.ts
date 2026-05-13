import { defineConfig } from 'vitest/config';

export const baseVitestConfig = defineConfig({
  test: {
    environment: 'node',

    globals: true,

    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
    },
  },
});

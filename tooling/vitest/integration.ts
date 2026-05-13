import { mergeConfig } from 'vitest/config';

import { baseVitestConfig } from './base';

export const integrationVitestConfig = mergeConfig(baseVitestConfig, {
  test: {
    testTimeout: 30000,
  },
});

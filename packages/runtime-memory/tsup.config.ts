import { defineConfig } from 'tsup';

import { baseConfig } from '../../tooling/tsup/base';

export default defineConfig({
  ...baseConfig,

  entry: ['src/index.ts'],
});

import { defineConfig } from 'tsup';

import { baseConfig } from '../../tooling/tsup/base';

import { nodeExternals } from '../../tooling/tsup/externals';

export default defineConfig({
  ...baseConfig,

  entry: ['src/index.ts'],

  external: nodeExternals,
});

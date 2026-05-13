import type { Options } from 'tsup';

export const baseConfig: Options = {
  clean: false,

  dts: false,

  sourcemap: true,

  treeshake: true,

  splitting: false,

  target: 'node20',

  platform: 'node',

  format: ['esm', 'cjs'],

  skipNodeModulesBundle: true,

  minify: false,

  keepNames: true,

  cjsInterop: true,

  shims: false,

  bundle: true,

  outExtension({ format }) {
    return {
      js: format === 'esm' ? '.mjs' : '.cjs',
    };
  },
};

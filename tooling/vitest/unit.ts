import { mergeConfig } from 'vitest/config';

import { baseVitestConfig } from './base';

export const unitVitestConfig = mergeConfig(baseVitestConfig, {});

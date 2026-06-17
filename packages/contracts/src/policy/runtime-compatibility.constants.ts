import { deepFreeze } from '../primitives/deep-freeze';
import type { RateLimitAlgorithmId } from './algorithm';
import type { RateLimitWindowPolicy } from './window.types';

export const SupportedAlgorithms = deepFreeze(['fixed-window'] as const);

const supportedWindowPolicies: Record<RateLimitAlgorithmId, ReadonlyArray<RateLimitWindowPolicy['type']>> = {
  'fixed-window': ['fixed-window'],
  'sliding-window-log': [],
  'sliding-window-counter': [],
  'token-bucket': [],
  'leaky-bucket': [],
  gcra: [],
};

export const SupportedWindowPolicies = deepFreeze(supportedWindowPolicies);

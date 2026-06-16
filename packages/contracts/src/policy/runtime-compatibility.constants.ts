import { deepFreeze } from '../primitives/deep-freeze';
import type { RateLimitAlgorithmId } from './algorithm';
import type { RateLimitWindowPolicy } from './window.types';

const supportedWindowPolicies: Record<RateLimitAlgorithmId, ReadonlyArray<RateLimitWindowPolicy['type']>> = {
  'fixed-window': ['fixed-window'],
  'sliding-window-log': ['fixed-window'],
  'sliding-window-counter': ['fixed-window'],
  'token-bucket': ['fixed-window'],
  'leaky-bucket': ['fixed-window'],
  gcra: ['fixed-window'],
};

export const SupportedWindowPolicies = deepFreeze(supportedWindowPolicies);

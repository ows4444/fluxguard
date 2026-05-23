import { deepFreeze } from '../primitives/deep-freeze';
import type { RateLimitAlgorithmId, RateLimitWindowPolicy } from './policy.contract';

const supportedWindowPolicies: Record<RateLimitAlgorithmId, ReadonlyArray<RateLimitWindowPolicy['type']>> = {
  'fixed-window': ['fixed-window', 'calendar-month-window'],

  'sliding-window-log': ['fixed-window'],
  'sliding-window-counter': ['fixed-window'],
  'token-bucket': ['fixed-window'],
  'leaky-bucket': ['fixed-window'],
  gcra: ['fixed-window'],
};

export const SupportedWindowPolicies = deepFreeze(supportedWindowPolicies);

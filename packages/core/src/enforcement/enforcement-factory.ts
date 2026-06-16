import {
  assertNever,
  calculateRetryAfterMs,
  type RateLimitEnforcement,
  type RateLimitRule,
} from '@fluxguard/contracts';

import type { AlgorithmResult } from '../algorithms/algorithm.contract';

const FULL_SHED_PROBABILITY = 1;

export function createEnforcement(
  rule: RateLimitRule,
  result: AlgorithmResult,
  nowMs: number,
): Exclude<RateLimitEnforcement, { readonly type: 'degraded' }> {
  if (rule.execution.action === 'shadow') {
    return { type: 'shadow' };
  }

  if (result.allowed) {
    return { type: 'allow' };
  }

  const retryAfterMs = calculateRetryAfterMs(nowMs, result.nextAllowedAtMs);

  switch (rule.execution.action) {
    case 'reject':
      return { type: 'reject', retryAfterMs };
    case 'throttle':
      return {
        type: 'throttle',
        retryAfterMs,
        shedProbability: rule.execution.shedProbability ?? FULL_SHED_PROBABILITY,
      };

    default:
      return assertNever(rule.execution.action);
  }
}

import type { RateLimitEvaluation } from '@fluxguard/contracts';

import type { AlgorithmResult } from '../algorithms/algorithm.contract';

export function createEvaluationSnapshot(ruleId: string, limit: number, result: AlgorithmResult): RateLimitEvaluation {
  return {
    ruleId,
    limit,
    remaining: result.remaining,
    resetAtMs: result.resetAtMs,
    ...(result.nextAllowedAtMs !== undefined ? { nextAllowedAtMs: result.nextAllowedAtMs } : {}),
  };
}

import type { RateLimitContext } from '@fluxguard/contracts';

import type { AlgorithmConsumeResult } from '../algorithms/index';
import type { RuntimeLimiterDefinition } from '../core/index';

export interface RuntimeExecutionContext {
  readonly definition: RuntimeLimiterDefinition;

  readonly key: string;

  readonly context: RateLimitContext;

  readonly startedAt: number;
}

export interface RuntimeExecutionResult {
  readonly context: RuntimeExecutionContext;

  readonly algorithm: AlgorithmConsumeResult;
}

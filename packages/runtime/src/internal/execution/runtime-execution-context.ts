import type { RateLimitContext } from '@fluxguard/contracts';

import type { RuntimeLimiterDefinition } from '../../core';
import type { RuntimeClock } from '../../time';
import type { AlgorithmConsumeResult } from '../algorithms/index';

export interface RuntimeExecutionContext {
  readonly definition: RuntimeLimiterDefinition;

  readonly key: string;

  readonly context: RateLimitContext;

  readonly startedAt: number;

  readonly clock: RuntimeClock;

  readonly signal?: AbortSignal;
}

export interface RuntimeExecutionResult {
  readonly context: RuntimeExecutionContext;

  readonly algorithm: AlgorithmConsumeResult;
}

export interface RuntimeExecutionMetadata {
  readonly consistent?: boolean;
}

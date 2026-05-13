import type { ConsumeResult, PeekResult, RateLimitContext } from '@fluxguard/contracts';

import type { RuntimeLimiterDefinition } from '../engine/runtime-limiter.definition';

export interface RuntimeConsumeRequest {
  readonly definition: RuntimeLimiterDefinition;

  readonly context: RateLimitContext;

  readonly key: string;
}

export interface RuntimePeekRequest {
  readonly definition: RuntimeLimiterDefinition;

  readonly context: RateLimitContext;

  readonly key: string;
}

export interface RuntimeExecutor {
  consume(request: RuntimeConsumeRequest): Promise<ConsumeResult>;

  peek(request: RuntimePeekRequest): Promise<PeekResult>;
}

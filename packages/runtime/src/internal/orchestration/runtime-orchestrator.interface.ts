import type { ConsumeResult, PeekResult, RateLimitContext } from '@fluxguard/contracts';

import type { RuntimeConsumeRequest, RuntimePeekRequest } from '../../core/executor';

export interface RuntimeOrchestrator {
  consume(limiterName: string, context: RateLimitContext): Promise<ConsumeResult>;

  peek(limiterName: string, context: RateLimitContext): Promise<PeekResult>;
}

export interface RuntimeExecutorRouter {
  consume(request: RuntimeConsumeRequest): Promise<ConsumeResult>;

  peek(request: RuntimePeekRequest): Promise<PeekResult>;
}

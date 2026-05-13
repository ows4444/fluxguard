import type { ConsumeResult, PeekResult, RateLimitContext } from '@fluxguard/contracts';

export interface RuntimeOrchestrator {
  consume(limiterName: string, context: RateLimitContext): Promise<ConsumeResult>;

  peek(limiterName: string, context: RateLimitContext): Promise<PeekResult>;
}

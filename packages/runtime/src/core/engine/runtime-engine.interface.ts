import type { ConsumeResult, PeekResult, RateLimitConfig, RateLimitContext } from '@fluxguard/contracts';

import type { RuntimeLimiterDefinition } from './runtime-limiter.definition';

export interface RuntimeEngineContract {
  register(name: string, config: RateLimitConfig): RuntimeLimiterDefinition;

  consume(limiterName: string, context: RateLimitContext): Promise<ConsumeResult>;

  peek(limiterName: string, context: RateLimitContext): Promise<PeekResult>;

  getDefinition(name: string): RuntimeLimiterDefinition | undefined;

  getDefinitions(): readonly RuntimeLimiterDefinition[];
}

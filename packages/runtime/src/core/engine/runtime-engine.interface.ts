import type {
  ConsumeResult,
  LimiterRuntimeState,
  PeekResult,
  RateLimitAdjustmentOptions,
  RateLimitConfig,
  RateLimitContext,
} from '@fluxguard/contracts';

import type { RuntimeLimiterDefinition } from './runtime-limiter.definition';

export interface RuntimeEngineContract {
  initialize?(): Promise<void>;

  dispose?(): Promise<void>;

  register(name: string, config: RateLimitConfig): RuntimeLimiterDefinition;

  consume(limiterName: string, context: RateLimitContext): Promise<ConsumeResult>;

  peek(limiterName: string, context: RateLimitContext): Promise<PeekResult>;

  getDefinition(name: string): RuntimeLimiterDefinition | undefined;

  getDefinitions(): readonly RuntimeLimiterDefinition[];

  adjust(limiterName: string, context: RateLimitContext, options: RateLimitAdjustmentOptions): Promise<void>;

  consumeMany(limiterNames: readonly string[], context: RateLimitContext): Promise<ConsumeResult>;

  peekMany(limiterNames: readonly string[], context: RateLimitContext): Promise<PeekResult>;

  registerPlan(name: string, limiters: readonly string[]): void;

  consumePlan(plan: string, context: RateLimitContext): Promise<ConsumeResult>;

  peekPlan(plan: string, context: RateLimitContext): Promise<PeekResult>;

  checkHealth(): Promise<void>;

  getRuntimeState(): LimiterRuntimeState;
}

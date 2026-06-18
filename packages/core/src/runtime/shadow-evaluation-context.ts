import type { Clock, RateLimitRequest, RateLimitRule } from '@fluxguard/contracts';

export interface ShadowEvaluationContext {
  readonly clock: Clock;

  readonly request: RateLimitRequest;

  readonly rule: RateLimitRule;

  readonly key: string;

  readonly startedAtUs: number;
}

import type { Clock, IRateLimitStore, RateLimitRequest, RateLimitRule } from '@fluxguard/contracts';

export interface ShadowEvaluationContext {
  readonly signal?: AbortSignal;

  readonly idempotencyKey?: string;

  readonly clock: Clock;

  readonly request: RateLimitRequest;

  readonly rule: RateLimitRule;

  readonly key: string;

  readonly store: IRateLimitStore;

  readonly startedAtUs: number;
}

import type { RateLimitRequest, RateLimitRule } from '@fluxguard/contracts';

export interface ShadowEvaluationPolicy {
  shouldEvaluate(request: RateLimitRequest, shadows: readonly RateLimitRule[]): boolean;
}

export class AlwaysEvaluateShadowPolicy implements ShadowEvaluationPolicy {
  shouldEvaluate(_request: RateLimitRequest, shadows: readonly RateLimitRule[]): boolean {
    return shadows.length > 0;
  }
}

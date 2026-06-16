import type { RateLimitRequest, RateLimitRule } from '@fluxguard/contracts';

export interface KeyBuilder {
  build(request: RateLimitRequest, rule: RateLimitRule): string;
}

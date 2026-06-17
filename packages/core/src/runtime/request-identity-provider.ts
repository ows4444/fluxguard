import type { RateLimitRequest } from '@fluxguard/contracts';

export interface RequestIdentityProvider {
  create(request: RateLimitRequest, rateLimitKey: string, ruleId?: string): string;
}

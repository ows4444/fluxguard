import type { RateLimitRequest } from '@fluxguard/contracts';

export interface RequestIdentityProvider {
  create(request: RateLimitRequest): string;
}

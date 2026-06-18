import { createHash } from 'node:crypto';

import { DEFAULT_REQUEST_COST, type RateLimitRequest } from '@fluxguard/contracts';

import type { RequestIdentityProvider } from './request-identity-provider';

export class DefaultRequestIdentityProvider implements RequestIdentityProvider {
  create(request: RateLimitRequest, rateLimitKey: string, ruleId?: string): string | undefined {
    if (request.idempotencyKey === undefined) {
      return undefined;
    }

    return createHash('sha256')
      .update(
        JSON.stringify({
          ruleId,
          rateLimitKey,
          idempotencyKey: request.idempotencyKey,
          route: request.route,
          method: request.method,
          cost: request.cost ?? DEFAULT_REQUEST_COST,
        }),
      )
      .digest('hex');
  }
}

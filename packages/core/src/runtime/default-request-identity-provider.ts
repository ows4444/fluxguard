import { createHash } from 'node:crypto';

import { DEFAULT_REQUEST_COST, type RateLimitRequest } from '@fluxguard/contracts';

import type { RequestIdentityProvider } from './request-identity-provider';

export class DefaultRequestIdentityProvider implements RequestIdentityProvider {
  create(request: RateLimitRequest, rateLimitKey: string, ruleId?: string): string | undefined {
    if (request.idempotencyKey === undefined) {
      return undefined;
    }

    const cost = request.cost ?? DEFAULT_REQUEST_COST;

    return createHash('sha256')
      .update(
        [ruleId ?? '', rateLimitKey, request.idempotencyKey, request.route, request.method, String(cost)].join('|'),
      )
      .digest('hex');
  }
}

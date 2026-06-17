import { createHash } from 'node:crypto';

import { DEFAULT_REQUEST_COST, type RateLimitRequest } from '@fluxguard/contracts';

import type { RequestIdentityProvider } from './request-identity-provider';

export class DefaultRequestIdentityProvider implements RequestIdentityProvider {
  create(request: RateLimitRequest, rateLimitKey: string): string {
    const sortedMeta = request.meta
      ? Object.fromEntries(Object.entries(request.meta).sort(([a], [b]) => a.localeCompare(b)))
      : undefined;

    return createHash('sha256')
      .update(
        JSON.stringify({
          rateLimitKey,
          apiKeyId: request.apiKeyId,
          userId: request.userId,
          ip: request.ip,
          route: request.route,
          method: request.method,
          cost: request.cost ?? DEFAULT_REQUEST_COST,
          meta: sortedMeta,
        }),
      )
      .digest('hex');
  }
}

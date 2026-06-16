import { createHash } from 'node:crypto';

import type { RateLimitRequest } from '@fluxguard/contracts';

import type { RequestIdentityProvider } from './request-identity-provider';

export class DefaultRequestIdentityProvider implements RequestIdentityProvider {
  create(request: RateLimitRequest): string {
    const sortedMeta = request.meta
      ? Object.fromEntries(Object.entries(request.meta).sort(([a], [b]) => a.localeCompare(b)))
      : undefined;

    return createHash('sha256')
      .update(
        JSON.stringify({
          apiKeyId: request.apiKeyId,
          userId: request.userId,
          ip: request.ip,
          route: request.route,
          method: request.method,
          cost: request.cost,
          meta: sortedMeta,
        }),
      )
      .digest('hex');
  }
}

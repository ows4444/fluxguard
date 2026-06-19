import type { RateLimitRequest } from '@fluxguard/contracts';

export function createEventSubject(request: RateLimitRequest) {
  return {
    ...(request.apiKeyId !== undefined ? { apiKeyId: request.apiKeyId } : {}),
    ...(request.userId !== undefined ? { userId: request.userId } : {}),
  };
}

import type { RateLimitMetadata } from '@fluxguard/contracts';
import { SetMetadata } from '@nestjs/common';

export const RATE_LIMIT_METADATA_KEY = 'fluxguard:rate-limit';

export function RateLimit<T extends string>(metadata: RateLimitMetadata<T>) {
  return SetMetadata(RATE_LIMIT_METADATA_KEY, metadata);
}

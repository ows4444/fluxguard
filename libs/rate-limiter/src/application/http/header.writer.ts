import type { Response } from 'express';
import type { RuntimeExposurePolicy } from '../../module/rate-limiter.interfaces';

export class RateLimitHeaderWriter {
  static apply(res: Response, limiterName: string, retryAfter: number, policy?: RuntimeExposurePolicy | null): void {
    if (policy?.exposeInHeaders === false) {
      return;
    }

    const retrySeconds = Math.max(1, Math.ceil(retryAfter / 1000));

    res.setHeader('RateLimit-Reset', String(retrySeconds));

    res.setHeader('RateLimit-Policy', `limiter="${limiterName}"`);

    if (retryAfter > 0) {
      res.setHeader('Retry-After', String(retrySeconds));
    }
  }
}

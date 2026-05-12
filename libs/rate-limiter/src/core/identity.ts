import { RateLimiterConfigurationError } from '../errors/rate-limiter.errors';

export class RateLimitIdentity {
  private static readonly MAX_LENGTH = 128;

  private static readonly VALUE_PATTERN = /^[a-zA-Z0-9:._@#|-]+$/;

  static normalizeOverride(value: string): string {
    const normalized = value.trim().toLowerCase();

    if (normalized.length === 0) {
      throw new RateLimiterConfigurationError('Rate limit override cannot be empty');
    }

    if (!this.VALUE_PATTERN.test(normalized)) {
      throw new RateLimiterConfigurationError('Rate limit override contains invalid characters');
    }

    return normalized.slice(0, this.MAX_LENGTH);
  }
}

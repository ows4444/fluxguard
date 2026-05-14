import type { ConsumeResult } from '@fluxguard/contracts';

import { degradedAllowedResult, degradedRejectedResult } from '../../../results';

interface Bucket {
  tokens: number;

  lastRefill: number;

  expiresAt: number;
}

export class RuntimeDegradationService {
  readonly #buckets = new Map<string, Bucket>();

  static readonly BUCKET_TTL_MS = 60_000;

  static readonly CLEANUP_INTERVAL = 1000;

  #operations = 0;

  shouldAllow(limiter: string, key: string, allowancePerSecond: number): boolean {
    this.cleanupExpiredBuckets();

    if (allowancePerSecond <= 0) {
      return false;
    }

    const now = Date.now();

    const bucketKey = `${limiter}:${key}`;

    const existing = this.#buckets.get(bucketKey) ?? {
      tokens: allowancePerSecond,
      lastRefill: now,
      expiresAt: now + RuntimeDegradationService.BUCKET_TTL_MS,
    };

    const elapsedSeconds = (now - existing.lastRefill) / 1000;

    const refill = elapsedSeconds * allowancePerSecond;

    existing.tokens = Math.min(allowancePerSecond, existing.tokens + refill);

    existing.lastRefill = now;

    if (existing.tokens < 1) {
      this.#buckets.set(bucketKey, existing);

      return false;
    }

    existing.tokens -= 1;

    existing.expiresAt = now + RuntimeDegradationService.BUCKET_TTL_MS;

    this.#buckets.set(bucketKey, existing);

    return true;
  }

  private cleanupExpiredBuckets(): void {
    this.#operations += 1;

    if (this.#operations % RuntimeDegradationService.CLEANUP_INTERVAL !== 0) {
      return;
    }

    const now = Date.now();

    for (const [key, bucket] of this.#buckets.entries()) {
      if (bucket.expiresAt <= now) {
        this.#buckets.delete(key);
      }
    }
  }

  createAllowedResult(key: string): ConsumeResult {
    return degradedAllowedResult(key);
  }

  createRejectedResult(key: string, retryAfter = 1000): ConsumeResult {
    return degradedRejectedResult(key, retryAfter);
  }
}

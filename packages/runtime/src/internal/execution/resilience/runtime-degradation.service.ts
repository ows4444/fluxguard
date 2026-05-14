import type { ConsumeResult } from '@fluxguard/contracts';

import { degradedAllowedResult, degradedRejectedResult } from '../../../results';
import { RuntimeExpiringMap } from '../../shared/runtime-expiring-map';

interface Bucket {
  tokens: number;

  lastRefill: number;

  expiresAt: number;
}

export class RuntimeDegradationService {
  readonly #buckets = new RuntimeExpiringMap<Bucket>({
    maxSize: 10_000,
  });

  static readonly BUCKET_TTL_MS = 60_000;

  static readonly CLEANUP_INTERVAL = 1000;

  destroy(): void {
    this.#buckets.destroy();
  }

  shouldAllow(limiter: string, key: string, allowancePerSecond: number): boolean {
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
      this.#buckets.set(bucketKey, existing, existing.expiresAt);

      return false;
    }

    existing.tokens -= 1;

    existing.expiresAt = now + RuntimeDegradationService.BUCKET_TTL_MS;

    this.#buckets.set(bucketKey, existing, existing.expiresAt);

    return true;
  }

  createAllowedResult(key: string): ConsumeResult {
    return degradedAllowedResult(key);
  }

  createRejectedResult(key: string, retryAfter = 1000): ConsumeResult {
    return degradedRejectedResult(key, retryAfter);
  }
}

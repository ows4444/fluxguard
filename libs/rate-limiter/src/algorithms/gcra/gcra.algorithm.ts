import { ResultFactory } from '../../core/contracts/result.factory';
import { AdvisoryPeekResult, ConsumeResult } from '../../core/contracts/result.types';
import type { GcraRuntimeConfig } from '../../module/rate-limiter.interfaces';

import { AlgorithmRedisKeys } from '../../redis/algorithm-keys';

import { BaseLimiterAlgorithm } from '../base/base-limiter.algorithm';

export class GcraAlgorithm extends BaseLimiterAlgorithm<GcraRuntimeConfig> {
  async consume(key: string, signal?: AbortSignal): Promise<ConsumeResult> {
    const redisKey = AlgorithmRedisKeys.gcra(this.limiterName, this.scope, key);

    const decoded = await this.scripts.executeGcraConsume(
      this.redis,
      [redisKey],
      [this.runtime.emissionIntervalMs, this.runtime.burstCapacity],
      signal,
    );

    return decoded.allowed
      ? ResultFactory.allowed(key, decoded.remaining, decoded.retryAfterMs)
      : ResultFactory.rejected(key, decoded.remaining, decoded.retryAfterMs);
  }

  async peekAdvisory(key: string): Promise<AdvisoryPeekResult> {
    const redisKey = AlgorithmRedisKeys.gcra(this.limiterName, this.scope, key);

    const decoded = await this.scripts.executeGcraPeek(
      this.redis,
      [redisKey],
      [this.runtime.emissionIntervalMs, this.runtime.burstCapacity],
    );

    return this.advisoryResult(key, decoded.allowed, decoded.remaining, decoded.retryAfterMs);
  }
}

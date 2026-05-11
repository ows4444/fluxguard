import { ResultFactory } from '../../core/contracts/result.factory';
import type { AdvisoryPeekResult, ConsumeResult } from '../../core/contracts/result.types';
import type { BurstRuntimeConfig, RateLimitAdjustmentOptions } from '../../module/rate-limiter.interfaces';

import { AlgorithmRedisKeys } from '../../redis/algorithm-keys';

import { BaseLimiterAlgorithm } from '../base/base-limiter.algorithm';
import type { AlgorithmContext } from '../contracts/algorithm.context';

export class BurstAlgorithm extends BaseLimiterAlgorithm<BurstRuntimeConfig> {
  constructor(ctx: AlgorithmContext<BurstRuntimeConfig>) {
    super(ctx);
  }

  async consume(key: string, signal?: AbortSignal): Promise<ConsumeResult> {
    const keys = AlgorithmRedisKeys.burst(this.limiterName, this.scope, key);

    const decoded = await this.scripts.executeBurstConsume(
      this.redis,
      [keys.sustained, keys.burst],
      [this.runtime.limit, this.runtime.sustainedDurationMs, this.runtime.burstCapacity, this.runtime.burstWindowMs],
      signal,
    );

    return decoded.allowed
      ? ResultFactory.allowed(key, decoded.remaining, decoded.retryAfterMs)
      : ResultFactory.rejected(key, decoded.remaining, decoded.retryAfterMs);
  }

  async reward(options: RateLimitAdjustmentOptions): Promise<void> {
    await this.executeReward(options, this.adjustmentConfig(options.key));
  }

  async penalty(options: RateLimitAdjustmentOptions): Promise<void> {
    await this.executePenalty(options, this.adjustmentConfig(options.key));
  }

  private adjustmentConfig(key: string) {
    return {
      scriptName: 'burst-adjust-idempotent',

      ttlSeconds: Math.ceil(Math.max(this.runtime.sustainedDurationMs, this.runtime.burstWindowMs) / 1000),

      resolveKeys: (operationId: string) => {
        const keys = AlgorithmRedisKeys.burstAdjustment(this.limiterName, this.scope, key, operationId);

        return [keys.sustained, keys.burst, keys.operation];
      },
    };
  }

  async peekAdvisory(key: string): Promise<AdvisoryPeekResult> {
    const keys = AlgorithmRedisKeys.burst(this.limiterName, this.scope, key);

    const decoded = await this.scripts.executeBurstGet(
      this.redis,
      [keys.sustained, keys.burst],
      [this.runtime.limit, this.runtime.burstCapacity],
    );

    return this.advisoryResult(key, decoded.remaining > 0, decoded.remaining, decoded.retryAfterMs);
  }
}

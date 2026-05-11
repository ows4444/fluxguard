import type { FixedWindowRuntimeConfig, RateLimitAdjustmentOptions } from '../../module/rate-limiter.interfaces';

import { AlgorithmRedisKeys } from '../../redis/algorithm-keys';

import { BaseLimiterAlgorithm } from '../base/base-limiter.algorithm';
import { ResultFactory } from '../../core/contracts/result.factory';
import { AdvisoryPeekResult, ConsumeResult } from '../../core/contracts/result.types';

export class FixedWindowAlgorithm extends BaseLimiterAlgorithm<FixedWindowRuntimeConfig> {
  constructor(...args: ConstructorParameters<typeof BaseLimiterAlgorithm<FixedWindowRuntimeConfig>>) {
    super(...args);

    if (
      this.progressiveBlocking &&
      this.progressiveBlocking.initialBlockSeconds > this.progressiveBlocking.maxBlockSeconds
    ) {
      throw new Error('Invalid progressive blocking configuration');
    }
  }

  async consume(key: string, signal?: AbortSignal): Promise<ConsumeResult> {
    const keys = AlgorithmRedisKeys.fixedWindow(this.limiterName, this.scope, key);

    const decoded = await this.scripts.executeFixedWindowConsume(
      this.redis,
      [keys.counter, keys.progressiveBlock, keys.progressiveViolation],
      [
        this.runtime.limit,
        this.runtime.durationMs,
        this.progressiveBlocking?.enabled ? this.progressiveBlocking.initialBlockSeconds : 0,
        this.progressiveBlocking?.multiplier ?? 2,
        this.progressiveBlocking?.maxBlockSeconds ?? 3600,
        this.progressiveBlocking?.violationTtlSeconds ?? 86400,
      ],
      signal,
    );

    if (decoded.blocked) {
      return ResultFactory.blocked(key, decoded.remaining, decoded.retryAfterMs);
    }

    return decoded.allowed
      ? ResultFactory.allowed(key, decoded.remaining, decoded.retryAfterMs)
      : ResultFactory.rejected(key, decoded.remaining, decoded.retryAfterMs);
  }

  async reward(options: RateLimitAdjustmentOptions): Promise<void> {
    await this.executeReward(options, this.adjustmentConfig(options));
  }

  async penalty(options: RateLimitAdjustmentOptions): Promise<void> {
    await this.executePenalty(options, this.adjustmentConfig(options));
  }

  private adjustmentConfig(options: RateLimitAdjustmentOptions) {
    return {
      scriptName: 'fixed-window-adjust-idempotent',
      ttlSeconds: Math.ceil(this.runtime.durationMs / 1000),
      resolveKeys: (operationId: string) => {
        const keys = AlgorithmRedisKeys.fixedWindowAdjustment(this.limiterName, this.scope, options.key, operationId);

        return [keys.counter, keys.operation];
      },
    };
  }

  async peekAdvisory(key: string): Promise<AdvisoryPeekResult> {
    const keys = AlgorithmRedisKeys.fixedWindow(this.limiterName, this.scope, key);

    const decoded = await this.scripts.executeFixedWindowGet(this.redis, [keys.counter], [this.runtime.limit]);

    return this.advisoryResult(key, decoded.remaining > 0, decoded.remaining, decoded.retryAfterMs);
  }
}

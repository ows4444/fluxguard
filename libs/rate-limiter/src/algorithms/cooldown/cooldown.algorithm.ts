import { ResultFactory } from '../../core/contracts/result.factory';
import { ConsistentPeekResult, ConsumeResult } from '../../core/contracts/result.types';
import type { CooldownRuntimeConfig } from '../../module/rate-limiter.interfaces';

import { AlgorithmRedisKeys } from '../../redis/algorithm-keys';
import { BaseLimiterAlgorithm } from '../base/base-limiter.algorithm';
import { AlgorithmContext } from '../contracts/algorithm.context';

export class CooldownAlgorithm extends BaseLimiterAlgorithm<CooldownRuntimeConfig> {
  constructor(ctx: AlgorithmContext<CooldownRuntimeConfig>) {
    super(ctx);
  }

  async consume(key: string, signal?: AbortSignal): Promise<ConsumeResult> {
    const redisKey = AlgorithmRedisKeys.cooldown(this.limiterName, this.scope, key);

    const ttl = await this.scripts.execute<number>(
      this.redis,
      'cooldown',
      [redisKey],
      [this.runtime.durationMs],
      signal,
    );

    if (ttl === 0) {
      return ResultFactory.allowed(key, 0, 0);
    }

    return ResultFactory.blocked(key, 0, ttl);
  }

  async peekConsistent(key: string): Promise<ConsistentPeekResult> {
    const redisKey = AlgorithmRedisKeys.cooldown(this.limiterName, this.scope, key);

    const decoded = await this.scripts.executeCooldownGet(this.redis, [redisKey]);

    return ResultFactory.consistent(
      decoded.allowed
        ? ResultFactory.allowed(key, null, decoded.retryAfterMs)
        : ResultFactory.blocked(key, null, decoded.retryAfterMs),
    );
  }
}

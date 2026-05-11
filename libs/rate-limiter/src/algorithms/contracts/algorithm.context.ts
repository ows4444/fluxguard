import type { RedisClient } from '../../redis/types';
import type { RedisScriptRegistry } from '../../redis/script-registry';

import type { RuntimeLimiterConfig, RuntimeProgressiveBlockingPolicy } from '../../module/rate-limiter.interfaces';

import type { MonotonicClockService } from '../../core/time/monotonic.time';

export interface AlgorithmContext<TConfig extends RuntimeLimiterConfig = RuntimeLimiterConfig> {
  readonly redis: RedisClient;

  readonly scripts: RedisScriptRegistry;

  readonly clock: MonotonicClockService;

  readonly limiterName: string;

  readonly scope: string;

  readonly runtime: TConfig;

  readonly progressiveBlocking?: RuntimeProgressiveBlockingPolicy;
}

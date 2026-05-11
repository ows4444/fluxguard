import { Injectable } from '@nestjs/common';

import type {
  BurstRuntimeConfig,
  CooldownRuntimeConfig,
  FixedWindowRuntimeConfig,
  GcraRuntimeConfig,
  RuntimeLimiterConfig,
  RuntimeProgressiveBlockingPolicy,
} from '../../module/rate-limiter.interfaces';

import type { LimiterAlgorithm } from '../../algorithms/contracts';

import { FixedWindowAlgorithm } from '../../algorithms/fixed-window/fixed-window.algorithm';

import { BurstAlgorithm } from '../../algorithms/burst/burst.algorithm';

import { CooldownAlgorithm } from '../../algorithms/cooldown/cooldown.algorithm';

import { GcraAlgorithm } from '../../algorithms/gcra/gcra.algorithm';

import type { RedisClient } from '../../redis/types';

import { RedisScriptRegistry } from '../../redis/script-registry';

import { MonotonicClockService } from '../time/monotonic.time';
import { AlgorithmContext } from '../../algorithms/contracts/algorithm.context';
import { optionalProp } from '../utils/object.utils';

@Injectable()
export class LimiterFactoryService {
  private readonly factories = {
    fixed: (ctx: AlgorithmContext<FixedWindowRuntimeConfig>) => new FixedWindowAlgorithm(ctx),
    gcra: (ctx: AlgorithmContext<GcraRuntimeConfig>) => new GcraAlgorithm(ctx),
    burst: (ctx: AlgorithmContext<BurstRuntimeConfig>) => new BurstAlgorithm(ctx),
    cooldown: (ctx: AlgorithmContext<CooldownRuntimeConfig>) => new CooldownAlgorithm(ctx),
  } as const;

  constructor(
    private readonly scripts: RedisScriptRegistry,

    private readonly clock: MonotonicClockService,
  ) {}

  create(
    name: string,
    runtime: RuntimeLimiterConfig,
    redis: RedisClient,
    scope: string,
    progressiveBlocking?: RuntimeProgressiveBlockingPolicy,
  ): LimiterAlgorithm {
    const baseContext = {
      redis,
      scripts: this.scripts,
      clock: this.clock,
      limiterName: name,
      scope,

      ...optionalProp('progressiveBlocking', progressiveBlocking),
    };

    switch (runtime.algorithm) {
      case 'fixed':
        return this.factories.fixed({
          ...baseContext,
          runtime,
        });

      case 'gcra':
        return this.factories.gcra({
          ...baseContext,
          runtime,
        });

      case 'burst':
        return this.factories.burst({
          ...baseContext,
          runtime,
        });

      case 'cooldown':
        return this.factories.cooldown({
          ...baseContext,
          runtime,
        });
    }
  }
}

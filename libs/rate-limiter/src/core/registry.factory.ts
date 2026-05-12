import { Injectable } from '@nestjs/common';

import { LimiterFactoryService } from './limiter/limiter.factory';

import { RateLimiterCompiler } from './config-normalizer';

import type { RedisClient } from '../redis/types';

import type { RateLimiterModuleOptions } from '../module/rate-limiter.interfaces';

import { LimiterRegistry, type RegisteredLimiter } from './registry';

@Injectable()
export class LimiterRegistryFactory {
  constructor(private readonly limiterFactory: LimiterFactoryService) {}

  create(options: RateLimiterModuleOptions, redis: RedisClient): LimiterRegistry {
    const scope = options.globalPrefix ?? 'default';

    const limiters = new Map<string, RegisteredLimiter>();

    for (const [name, raw] of Object.entries(options.limiters)) {
      if (limiters.has(name)) {
        throw new Error(`Duplicate limiter "${name}"`);
      }

      const compiled = RateLimiterCompiler.compile(name, raw, scope);

      const algorithm = this.limiterFactory.create(name, compiled.runtime, redis, scope, compiled.progressiveBlocking);

      limiters.set(name, {
        name,
        scope,

        runtime: compiled.runtime,

        execution: compiled.execution,

        resilience: compiled.resilience,

        exposure: compiled.exposure,

        adjustments: compiled.adjustments,

        identity: compiled.identity,

        blocking: compiled.blocking,

        progressiveBlocking: compiled.progressiveBlocking,

        algorithm,
      });
    }

    return new LimiterRegistry(limiters);
  }
}

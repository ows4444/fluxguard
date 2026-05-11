import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { RATE_LIMITER_OPTIONS } from '../module/rate-limiter.constants';
import type { RateLimiterModuleOptions } from '../module/rate-limiter.interfaces';
import { LimiterFactoryService } from './limiter/limiter.factory';
import { LimiterRegistry } from './registry';
import { RateLimiterCompiler } from './config-normalizer';
import { REDIS_CLIENT } from '../module/tokens';
import { type RedisClient } from '../redis/types';
import { RedisScriptRegistry } from '../redis/script-registry';
import { RedisHealthService } from '../redis/health/redis.health';
import { optionalProp } from './utils/object.utils';

@Injectable()
export class RateLimiterBootstrap implements OnModuleInit {
  private readonly logger = new Logger(RateLimiterBootstrap.name);
  constructor(
    @Inject(RATE_LIMITER_OPTIONS)
    private readonly options: RateLimiterModuleOptions,
    @Inject(REDIS_CLIENT)
    private readonly redis: RedisClient,
    private readonly factory: LimiterFactoryService,
    private readonly registry: LimiterRegistry,
    private readonly scripts: RedisScriptRegistry,
    private readonly health: RedisHealthService,
  ) {}

  async onModuleInit(): Promise<void> {
    const healthy = await this.health.isHealthy();

    if (!healthy) {
      this.logger.warn('Redis unavailable during bootstrap; starting in degraded mode', RateLimiterBootstrap.name);
    }

    if (Object.keys(this.options.limiters).length === 0) {
      this.logger.warn('Rate limiter initialized with zero configured limiters', RateLimiterBootstrap.name);
    }

    await this.scripts.warmup(this.redis);

    if ('on' in this.redis && 'nodes' in this.redis) {
      this.redis.on('nodeAdded', () => {
        void this.scripts.warmup(this.redis);
      });

      this.redis.on('nodeRemoved', () => {
        void this.scripts.warmup(this.redis);
      });

      this.redis.on('refresh', () => {
        void this.scripts.warmup(this.redis);
      });

      this.redis.on('ready', () => {
        void this.scripts.warmup(this.redis);
      });
    }

    const scope = this.options.globalPrefix ?? 'default';

    for (const [name, raw] of Object.entries(this.options.limiters)) {
      const compiled = RateLimiterCompiler.compile(name, raw, scope);

      const algorithm = this.factory.create(name, compiled.runtime, this.redis, scope, compiled.progressiveBlocking);

      this.registry.register({
        name,
        scope,

        runtime: compiled.runtime,

        execution: compiled.execution,

        resilience: compiled.resilience,

        exposure: compiled.exposure,

        adjustments: compiled.adjustments,

        identity: compiled.identity,

        algorithm,

        ...optionalProp('blocking', compiled.blocking),

        ...optionalProp('progressiveBlocking', compiled.progressiveBlocking),
      });
    }
  }
}

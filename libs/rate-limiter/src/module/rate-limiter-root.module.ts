import { DynamicModule, Module, Provider } from '@nestjs/common';

import { RateLimiterGuard } from '../application/guards/rate-limiter.guard';
import { RateLimiterService } from '../core/rate-limiter.service';
import { RateLimitOrchestrator } from '../core/orchestrator';
import { RateLimitContextFactory } from '../application/http/context.factory';
import { LimiterFactoryService } from '../core/limiter/limiter.factory';
import { RedisScriptRegistry } from '../redis/script-registry';
import { RedisExecutor } from '../redis/executor';
import { LimiterFailurePolicyService } from '../core/limiter-failure-policy.service';
import { LimiterEventPublisher } from '../core/limiter-event-publisher';
import { CircuitBreakerService } from '../core/policy/circuit-breaker.service';
import { DegradedModeService } from '../core/policy/degraded-mode.service';
import { HotKeyShieldService } from '../core/policy/hot-key-shield.service';
import { AdmissionControlService } from '../core/policy/admission-control.service';
import { ContextResolverService } from '../core/context/context-resolver.service';
import { RateLimitResultSelector } from '../core/rate-limit-result.selector';
import { RateLimitAdjustmentInterceptor } from '../application/interceptors/rate-limit-adjustment.interceptor';
import { MonotonicClockService } from '../core/time/monotonic.time';
import { HybridClockService } from '../core/time/hybrid-clock.service';
import { ParallelEvaluatorService } from '../core/execution/parallel-evaluator';
import { RedisHealthService } from '../redis/health/redis.health';

import { RATE_LIMITER_OPTIONS } from './rate-limiter.constants';

import type {
  RateLimiterModuleOptions,
  RateLimiterModuleAsyncOptions,
  RateLimiterOptionsFactory,
} from './rate-limiter.interfaces';
import { LimiterRegistry } from '../core/registry';
import { RedisClient } from '../redis/types';
import { LimiterRegistryFactory } from '../core/registry.factory';
import { RATE_LIMITER_REDIS } from './tokens';

@Module({})
export class RateLimiterRootModule {
  static forRoot(options: RateLimiterModuleOptions): DynamicModule {
    if (!options.limiters) {
      throw new Error('RateLimiterModule requires "limiters" configuration');
    }

    return this.buildModule([
      {
        provide: RATE_LIMITER_OPTIONS,
        useValue: options,
      },
    ]);
  }

  static forRootAsync(options: RateLimiterModuleAsyncOptions): DynamicModule {
    const asyncProviders = this.createAsyncProviders(options);

    return this.buildModule(asyncProviders, options.imports);
  }

  private static buildModule(optionProviders: Provider[], imports: DynamicModule['imports'] = []): DynamicModule {
    return {
      module: RateLimiterRootModule,
      global: true,
      imports: imports ?? [],

      providers: [
        ...optionProviders,

        MonotonicClockService,
        HybridClockService,
        RateLimiterService,
        RateLimiterGuard,
        RateLimitOrchestrator,
        RateLimitContextFactory,
        ContextResolverService,
        LimiterFactoryService,
        RateLimitAdjustmentInterceptor,
        RedisScriptRegistry,
        RedisExecutor,
        RedisHealthService,

        LimiterFailurePolicyService,
        LimiterEventPublisher,
        ParallelEvaluatorService,
        CircuitBreakerService,
        DegradedModeService,
        HotKeyShieldService,
        AdmissionControlService,
        RateLimitResultSelector,

        {
          provide: LimiterRegistry,
          useFactory: (options: RateLimiterModuleOptions, redis: RedisClient, factory: LimiterRegistryFactory) => {
            return factory.create(options, redis);
          },
          inject: [RATE_LIMITER_OPTIONS, RATE_LIMITER_REDIS, LimiterRegistryFactory],
        },
      ],

      exports: [
        RateLimiterService,
        RateLimiterGuard,
        RateLimitOrchestrator,
        ContextResolverService,
        RedisScriptRegistry,
      ],
    };
  }

  private static createAsyncProviders(options: RateLimiterModuleAsyncOptions): Provider[] {
    if (options.useFactory) {
      return [
        {
          provide: RATE_LIMITER_OPTIONS,
          useFactory: options.useFactory,
          inject: options.inject ?? [],
        },
      ];
    }

    if (options.useClass) {
      return [
        {
          provide: options.useClass,
          useClass: options.useClass,
        },
        {
          provide: RATE_LIMITER_OPTIONS,
          useFactory: async (factory: RateLimiterOptionsFactory) => factory.createRateLimiterOptions(),
          inject: [options.useClass],
        },
      ];
    }

    if (options.useExisting) {
      return [
        {
          provide: RATE_LIMITER_OPTIONS,
          useFactory: async (factory: RateLimiterOptionsFactory) => factory.createRateLimiterOptions(),
          inject: [options.useExisting],
        },
      ];
    }

    throw new Error('Invalid RateLimiterModule async configuration');
  }
}

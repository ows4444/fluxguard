import { DynamicModule, Global, Module, Provider } from '@nestjs/common';
import { RateLimiterGuard } from '../application/guards/rate-limiter.guard';
import { RateLimiterService } from '../core/rate-limiter.service';
import { RateLimitOrchestrator } from '../core/orchestrator';
import { RateLimitContextFactory } from '../application/http/context.factory';
import { LimiterRegistry } from '../core/registry';
import { LimiterFactoryService } from '../core/limiter/limiter.factory';
import { RedisScriptRegistry } from '../redis/script-registry';
import { RedisExecutor } from '../redis/executor';
import { LimiterFailurePolicyService } from '../core/limiter-failure-policy.service';
import { LimiterEventPublisher } from '../core/limiter-event-publisher';
import { CircuitBreakerService } from '../core/policy/circuit-breaker.service';
import { DegradedModeService } from '../core/policy/degraded-mode.service';
import { ContextResolverService } from '../core/context/context-resolver.service';
import { RateLimitResultSelector } from '../core/rate-limit-result.selector';
import { RateLimiterBootstrap } from '../core/rate-limiter.bootstrap';
import { RateLimitAdjustmentInterceptor } from '../application/interceptors/rate-limit-adjustment.interceptor';
import { MonotonicClockService } from '../core/time/monotonic.time';
import { HybridClockService } from '../core/time/hybrid-clock.service';
import { ParallelEvaluatorService } from '../core/execution/parallel-evaluator';

@Global()
@Module({})
export class RateLimiterModule {
  private static buildModule(optionProviders: Provider[], imports: DynamicModule['imports'] = []): DynamicModule {
    return {
      module: RateLimiterModule,
      imports: imports ?? [],
      providers: [
        ...optionProviders,
        MonotonicClockService,
        RateLimiterBootstrap,
        RateLimiterService,
        RateLimiterGuard,
        RateLimitOrchestrator,
        RateLimitContextFactory,
        ContextResolverService,
        LimiterRegistry,
        LimiterFactoryService,
        RateLimitAdjustmentInterceptor,
        RedisScriptRegistry,
        RedisExecutor,
        HybridClockService,
        LimiterFailurePolicyService,
        LimiterEventPublisher,
        ParallelEvaluatorService,
        CircuitBreakerService,
        DegradedModeService,
        RateLimitResultSelector,
      ],
      exports: [RateLimiterService, RateLimiterGuard, RateLimitOrchestrator],
    };
  }
}

import { Injectable } from '@nestjs/common';
import { RateLimiterConfigurationError } from '../errors/rate-limiter.errors';
import type {
  RuntimeAdjustmentPolicy,
  RuntimeBlockingPolicy,
  RuntimeExecutionPolicy,
  RuntimeExposurePolicy,
  RuntimeIdentityPolicy,
  RuntimeLimiterConfig,
  RuntimeProgressiveBlockingPolicy,
  RuntimeResiliencePolicy,
} from '../module/rate-limiter.interfaces';

import type { LimiterAlgorithm } from '../algorithms/contracts';

export interface RegisteredLimiter {
  readonly name: string;
  readonly scope: string;
  readonly runtime: RuntimeLimiterConfig;
  readonly execution: RuntimeExecutionPolicy;
  readonly resilience: RuntimeResiliencePolicy;
  readonly exposure: RuntimeExposurePolicy;
  readonly adjustments: RuntimeAdjustmentPolicy;
  readonly identity: RuntimeIdentityPolicy;
  readonly blocking?: RuntimeBlockingPolicy;
  readonly progressiveBlocking?: RuntimeProgressiveBlockingPolicy;
  readonly algorithm: LimiterAlgorithm;
}

@Injectable()
export class LimiterRegistry {
  constructor(private readonly limiters: ReadonlyMap<string, RegisteredLimiter>) {}

  get(name: string): RegisteredLimiter {
    const limiter = this.limiters.get(name);

    if (!limiter) {
      throw new RateLimiterConfigurationError(`Limiter "${name}" not registered`);
    }

    return limiter;
  }

  getAll(): ReadonlyMap<string, RegisteredLimiter> {
    return this.limiters;
  }
}

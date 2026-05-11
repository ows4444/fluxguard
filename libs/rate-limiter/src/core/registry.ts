import { Injectable } from '@nestjs/common';
import type {
  RuntimeExecutionPolicy,
  RuntimeResiliencePolicy,
  RuntimeExposurePolicy,
  RuntimeAdjustmentPolicy,
  RuntimeIdentityPolicy,
  RuntimeBlockingPolicy,
  RuntimeLimiterConfig,
  RuntimeProgressiveBlockingPolicy,
} from '../module/rate-limiter.interfaces';

import { type LimiterAlgorithm } from '../algorithms/contracts';
import { RateLimiterConfigurationError } from '../errors/rate-limiter.errors';
import { deepFreeze } from './utils/deep-freeze';

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
  private readonly limiters = new Map<string, RegisteredLimiter>();

  register(entry: RegisteredLimiter): void {
    if (this.limiters.has(entry.name)) {
      throw new RateLimiterConfigurationError(`Duplicate limiter "${entry.name}"`);
    }

    this.limiters.set(entry.name, deepFreeze(entry));
  }

  get(name: string): RegisteredLimiter {
    const limiter = this.limiters.get(name);

    if (!limiter) {
      throw new RateLimiterConfigurationError(`Limiter "${name}" not registered`);
    }

    return limiter;
  }

  getAll(): ReadonlyMap<string, RegisteredLimiter> {
    return new Map(this.limiters);
  }
}

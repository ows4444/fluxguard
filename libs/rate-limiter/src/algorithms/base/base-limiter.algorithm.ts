import { optionalProp } from '../../core/utils/object.utils';

import { ResultFactory } from '../../core/contracts/result.factory';

import type { AdvisoryPeekResult, ConsumeResult } from '../../core/contracts/result.types';

import type { RateLimitAdjustmentOptions, RuntimeLimiterConfig } from '../../module/rate-limiter.interfaces';

import type { LimiterAlgorithm } from '../contracts';

import type { AlgorithmContext } from '../contracts/algorithm.context';

import { AdjustmentService } from '../runtime/adjustment.service';

export interface AdjustmentConfig {
  readonly scriptName: string;

  readonly ttlSeconds: number;

  readonly resolveKeys: (operationId: string) => string[];
}

export abstract class BaseLimiterAlgorithm<TConfig extends RuntimeLimiterConfig> implements LimiterAlgorithm {
  constructor(protected readonly ctx: AlgorithmContext<TConfig>) {}

  protected async executeAdjustment(
    options: RateLimitAdjustmentOptions & {
      readonly direction: 'reward' | 'penalty';
    },
    config: AdjustmentConfig,
  ): Promise<void> {
    const operationId = AdjustmentService.requireOperationId(options.operationId);

    await AdjustmentService.execute({
      redis: this.ctx.redis,

      scripts: this.ctx.scripts,

      scriptName: config.scriptName,

      keys: config.resolveKeys(operationId),

      ttlSeconds: config.ttlSeconds,

      direction: options.direction,

      ...optionalProp('amount', options.amount),
    });
  }

  protected executeReward(options: RateLimitAdjustmentOptions, config: AdjustmentConfig): Promise<void> {
    return this.executeAdjustment(
      {
        ...options,
        direction: 'reward',
      },
      config,
    );
  }

  protected executePenalty(options: RateLimitAdjustmentOptions, config: AdjustmentConfig): Promise<void> {
    return this.executeAdjustment(
      {
        ...options,
        direction: 'penalty',
      },
      config,
    );
  }

  protected advisoryResult(
    key: string,
    allowed: boolean,
    remainingPoints: number,
    msBeforeNext: number,
  ): AdvisoryPeekResult {
    return ResultFactory.advisory(
      allowed
        ? ResultFactory.allowed(key, remainingPoints, msBeforeNext)
        : ResultFactory.rejected(key, remainingPoints, msBeforeNext),
    );
  }

  protected get redis() {
    return this.ctx.redis;
  }

  protected get scripts() {
    return this.ctx.scripts;
  }

  protected get runtime() {
    return this.ctx.runtime;
  }

  protected get limiterName() {
    return this.ctx.limiterName;
  }

  protected get scope() {
    return this.ctx.scope;
  }

  protected get progressiveBlocking() {
    return this.ctx.progressiveBlocking;
  }

  abstract consume(key: string, signal?: AbortSignal): Promise<ConsumeResult>;
}

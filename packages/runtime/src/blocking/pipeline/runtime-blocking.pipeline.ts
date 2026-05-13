import { type ConsumeResult, DecisionOutcome, type PeekResult } from '@fluxguard/contracts';

import type { RuntimeExecutionPipeline } from '../../execution/pipeline/runtime-execution-pipeline.interface';
import type { RuntimeExecutionContext } from '../../execution/runtime-execution-context';
import { blockedResult } from '../../results/index';
import type { RuntimeStore } from '../../storage/contracts/index';
import { RedisClusterKeyFactory } from '../../storage/redis/redis-cluster-key.factory';
import { ProgressiveBlockingService } from '../services/progressive-blocking.service';
import { ViolationTrackerService } from '../services/violation-tracker.service';

export interface RuntimeBlockingPipelineOptions {
  readonly store: RuntimeStore;

  readonly pipeline: RuntimeExecutionPipeline;
}

export class RuntimeBlockingPipeline implements RuntimeExecutionPipeline {
  readonly #pipeline: RuntimeExecutionPipeline;

  readonly #blocking: ProgressiveBlockingService;

  readonly #violations: ViolationTrackerService;

  constructor(options: RuntimeBlockingPipelineOptions) {
    this.#pipeline = options.pipeline;

    this.#blocking = new ProgressiveBlockingService({
      store: options.store,
    });

    this.#violations = new ViolationTrackerService({
      store: options.store,
    });
  }

  async consume(context: RuntimeExecutionContext): Promise<ConsumeResult> {
    const runtime = context.definition.compiled.runtime;

    const blocking = context.definition.compiled.blocking;

    const progressive = context.definition.compiled.progressiveBlocking;

    if (
      runtime.algorithm !== 'fixed' ||
      !blocking ||
      !progressive ||
      !('consumeWithProgressiveBlocking' in this.#store)
    ) {
      return this.#pipeline.consume(context);
    }

    const result = await this.#store.consumeWithProgressiveBlocking(
      context.key,
      RedisClusterKeyFactory.scoped(context.key, 'block'),
      RedisClusterKeyFactory.scoped(context.key, 'violations'),
      runtime.limit,
      runtime.durationMs,
      progressive.initialBlockSeconds,
      progressive.multiplier,
      progressive.maxBlockSeconds,
      progressive.violationTtlSeconds,
    );

    if (result.blocked) {
      return blockedResult(context.key, 0, result.retryAfter);
    }

    if (!result.allowed) {
      return blockedResult(context.key, 0, result.retryAfter);
    }

    return {
      key: context.key,

      outcome: DecisionOutcome.ALLOWED,

      remainingPoints: result.remaining,

      msBeforeNext: 0,
    };
  }

  async peek(context: RuntimeExecutionContext): Promise<PeekResult> {
    return this.#pipeline.peek(context);
  }
}

import { type ConsumeResult, type PeekResult } from '@fluxguard/contracts';

import { RedisClusterKeyFactory } from '../../../adapters/redis/internal/redis-cluster-key.factory';
import { allowedResult, blockedResult, rejectedResult } from '../../../results';
import type { RuntimeStore } from '../../../storage';
import type { RuntimeExecutionPipeline } from '../../execution/pipeline/runtime-execution-pipeline.interface';
import type { RuntimeExecutionContext } from '../../execution/runtime-execution-context';

export interface RuntimeBlockingPipelineOptions {
  readonly store: RuntimeStore;

  readonly pipeline: RuntimeExecutionPipeline;
}

export class RuntimeBlockingPipeline implements RuntimeExecutionPipeline {
  readonly #store: RuntimeStore;

  readonly #pipeline: RuntimeExecutionPipeline;

  constructor(options: RuntimeBlockingPipelineOptions) {
    this.#store = options.store;

    this.#pipeline = options.pipeline;
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
      context.signal,
    );

    if (result.blocked) {
      return blockedResult(context.key, 0, result.retryAfter);
    }

    if (!result.allowed) {
      return rejectedResult(context.key, result.remaining, result.retryAfter);
    }

    return allowedResult(context.key, result.remaining, 0);
  }

  async peek(context: RuntimeExecutionContext): Promise<PeekResult> {
    return this.#pipeline.peek(context);
  }
}

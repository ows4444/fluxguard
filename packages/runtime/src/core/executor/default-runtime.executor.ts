import type { ConsumeResult, PeekResult } from '@fluxguard/contracts';

import type { RuntimeEventBus } from '../../events';
import type { RuntimeExecutionContext } from '../../execution/index';
import type { RuntimeExecutionPipeline } from '../../execution/pipeline/runtime-execution-pipeline.interface';
import { isBlocked, isDegraded } from '../../results';
import type { RuntimeConsumeRequest, RuntimeExecutor, RuntimePeekRequest } from './runtime-executor.interface';

export interface DefaultRuntimeExecutorOptions {
  readonly pipeline: RuntimeExecutionPipeline;

  readonly events: RuntimeEventBus;
}

export class DefaultRuntimeExecutor implements RuntimeExecutor {
  readonly #pipeline: RuntimeExecutionPipeline;
  readonly #events: RuntimeEventBus;

  constructor(options: DefaultRuntimeExecutorOptions) {
    this.#pipeline = options.pipeline;
    this.#events = options.events;
  }

  async consume(request: RuntimeConsumeRequest): Promise<ConsumeResult> {
    const context = this.createExecutionContext(request);

    const started = performance.now();

    const result = await this.#pipeline.consume(context);

    this.#events.emitDecision({
      limiter: request.definition.name,

      key: request.key,

      outcome: result.outcome,

      kind: request.definition.compiled.kind,

      remaining: result.remainingPoints,

      retryAfter: result.msBeforeNext,

      durationMs: performance.now() - started,

      degraded: isDegraded(result),

      blocked: isBlocked(result),

      timestamp: Date.now(),
    });

    return result;
  }

  async peek(request: RuntimePeekRequest): Promise<PeekResult> {
    const context = this.createExecutionContext(request);

    return this.#pipeline.peek(context);
  }

  private createExecutionContext(request: RuntimeConsumeRequest | RuntimePeekRequest): RuntimeExecutionContext {
    return {
      definition: request.definition,

      key: request.key,

      context: request.context,

      startedAt: Date.now(),
    };
  }
}

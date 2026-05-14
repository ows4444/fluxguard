import type { ConsumeResult, PeekResult } from '@fluxguard/contracts';

import type { RuntimeEventBus } from '../../events';
import type { RuntimeExecutionContext, RuntimeExecutionPipeline } from '../../internal/execution';
import { isBlocked, isDegraded } from '../../results';
import type { RuntimeClock, RuntimeMonotonicClock } from '../../time';
import type { RuntimeConsumeRequest, RuntimeExecutor, RuntimePeekRequest } from './runtime-executor.interface';

export interface DefaultRuntimeExecutorOptions {
  readonly pipeline: RuntimeExecutionPipeline;

  readonly events: RuntimeEventBus;

  readonly clock: RuntimeClock;

  readonly monotonicClock: RuntimeMonotonicClock;
}

export class DefaultRuntimeExecutor implements RuntimeExecutor {
  readonly #events: RuntimeEventBus;
  readonly #pipeline: RuntimeExecutionPipeline;

  readonly #clock: RuntimeClock;

  readonly #monotonicClock: RuntimeMonotonicClock;

  constructor(options: DefaultRuntimeExecutorOptions) {
    this.#pipeline = options.pipeline;
    this.#events = options.events;
    this.#clock = options.clock;
    this.#monotonicClock = options.monotonicClock;
  }

  async consume(request: RuntimeConsumeRequest): Promise<ConsumeResult> {
    const context = await this.createExecutionContext(request);

    const started = this.#monotonicClock.now();

    const startedAt = await this.#clock.now();

    try {
      const result = await this.#pipeline.consume(context);

      const durationMs = this.#monotonicClock.now() - started;

      this.#events.emitDecision({
        limiter: request.definition.name,

        key: request.key,

        outcome: result.outcome,

        kind: request.definition.compiled.kind,

        remaining: result.remainingPoints,

        retryAfter: result.msBeforeNext,

        durationMs,

        degraded: isDegraded(result),

        blocked: isBlocked(result),

        timestamp: Date.now(),
      });

      this.#events.emitMetrics({
        limiter: request.definition.name,

        durationMs,

        success: true,

        degraded: isDegraded(result),

        blocked: isBlocked(result),

        timestamp: Date.now(),
      });

      this.#events.emitTracing({
        limiter: request.definition.name,

        operation: 'consume',

        startedAt,

        finishedAt: Date.now(),

        durationMs,

        success: true,
      });

      return result;
    } catch (error) {
      const durationMs = performance.now() - started;

      this.#events.emitMetrics({
        limiter: request.definition.name,

        durationMs,

        success: false,

        degraded: false,

        blocked: false,

        timestamp: Date.now(),
      });

      this.#events.emitTracing({
        limiter: request.definition.name,

        operation: 'consume',

        startedAt,

        finishedAt: Date.now(),

        durationMs,

        success: false,

        error: error instanceof Error ? error.message : 'UNKNOWN',
      });

      throw error;
    }
  }

  async peek(request: RuntimePeekRequest): Promise<PeekResult> {
    const context = await this.createExecutionContext(request);

    const started = this.#monotonicClock.now();

    const startedAt = Date.now();

    try {
      const result = await this.#pipeline.peek(context);

      this.#events.emitTracing({
        limiter: request.definition.name,

        operation: 'peek',

        startedAt,

        finishedAt: Date.now(),

        durationMs: performance.now() - started,

        success: true,
      });

      return result;
    } catch (error) {
      this.#events.emitTracing({
        limiter: request.definition.name,

        operation: 'peek',

        startedAt,

        finishedAt: Date.now(),

        durationMs: performance.now() - started,

        success: false,

        error: error instanceof Error ? error.message : 'UNKNOWN',
      });

      throw error;
    }
  }

  private async createExecutionContext(
    request: RuntimeConsumeRequest | RuntimePeekRequest,
  ): Promise<RuntimeExecutionContext> {
    return {
      definition: request.definition,

      key: request.key,

      context: request.context,

      startedAt: await this.#clock.now(),

      clock: this.#clock,
    };
  }
}

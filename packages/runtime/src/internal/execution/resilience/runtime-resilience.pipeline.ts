import type { ConsumeResult, PeekResult, RuntimeFailureEvent } from '@fluxguard/contracts';

import { RuntimeInfrastructureError } from '../../../errors';
import type { RuntimeStoreHealthMonitor } from '../../state';
import type { RuntimeExecutionPipeline } from '../pipeline/runtime-execution-pipeline.interface';
import type { RuntimeExecutionContext } from '../runtime-execution-context';
import { RuntimeExecutionAbortedError } from './runtime-aborted.error';
import { RuntimeCircuitBreakerOpenError } from './runtime-circuit-breaker.error';
import { RuntimeFailPolicyService } from './runtime-fail-policy.service';
import type { RuntimeResilienceState } from './runtime-resilience.state';
import { RuntimeTimeoutError, RuntimeTimeoutService } from './runtime-timeout.service';

export interface RuntimeResiliencePipelineOptions {
  readonly pipeline: RuntimeExecutionPipeline;

  readonly health: RuntimeStoreHealthMonitor;

  readonly state: RuntimeResilienceState;

  readonly monotonicNow: () => number;

  readonly wallClockNow: () => number;

  readonly onFailure?: (event: RuntimeFailureEvent) => void;
}

export class RuntimeResiliencePipeline implements RuntimeExecutionPipeline {
  readonly #pipeline: RuntimeExecutionPipeline;

  readonly #health: RuntimeStoreHealthMonitor;

  readonly #onFailure: ((event: RuntimeFailureEvent) => void) | undefined;

  readonly #timeout = new RuntimeTimeoutService();

  readonly #policy = new RuntimeFailPolicyService();

  readonly #monotonicNow: () => number;

  readonly #wallClockNow: () => number;

  readonly #state: RuntimeResilienceState;

  constructor(options: RuntimeResiliencePipelineOptions) {
    this.#pipeline = options.pipeline;

    this.#health = options.health;

    this.#state = options.state;

    this.#monotonicNow = options.monotonicNow;

    this.#wallClockNow = options.wallClockNow;

    this.#onFailure = options.onFailure;
  }

  async consume(context: RuntimeExecutionContext): Promise<ConsumeResult> {
    const started = this.#monotonicNow();

    try {
      if (!this.#state.breaker.canExecute()) {
        throw new RuntimeCircuitBreakerOpenError();
      }

      const result = await this.#timeout.execute(async ({ signal, timedOut }) => {
        const response = await this.#pipeline.consume({
          ...context,
          signal,
        });

        if (timedOut()) {
          throw new RuntimeTimeoutError(context.definition.descriptor.execution.timeoutMs);
        }

        return response;
      }, context.definition.descriptor.execution.timeoutMs);

      this.#state.latency.record(this.#monotonicNow() - started);

      this.#state.breaker.success();

      return result;
    } catch (error) {
      const durationMs = this.#monotonicNow() - started;

      this.#state.latency.record(durationMs);

      if (!(error instanceof RuntimeExecutionAbortedError) && this.isInfrastructureFailure(error)) {
        this.#state.breaker.failure();
      }

      this.#onFailure?.({
        limiter: context.definition.name,

        key: context.key,

        reason: error instanceof Error ? error.message : 'UNKNOWN',

        timestamp: this.#wallClockNow(),

        durationMs,
      });

      const failOpen = this.#policy.shouldAllowOnFailure(context.definition.descriptor.resilience.failBehavior);

      if (failOpen) {
        const allowance = context.definition.descriptor.resilience.degradedAllowancePerSecond;

        const allowed = this.#state.degradation.shouldAllow(context.definition.name, context.key, allowance);

        if (!allowed) {
          return this.#state.degradation.createRejectedResult(context.key);
        }

        return this.#state.degradation.createAllowedResult(context.key);
      }

      throw new RuntimeInfrastructureError(`Limiter execution failed: ${context.definition.name}`, {
        cause: error,
      });
    }
  }

  async peek(context: RuntimeExecutionContext): Promise<PeekResult> {
    return this.#pipeline.peek(context);
  }

  private isInfrastructureFailure(error: unknown): boolean {
    return (
      error instanceof RuntimeInfrastructureError ||
      error instanceof RuntimeCircuitBreakerOpenError ||
      error instanceof RuntimeTimeoutError
    );
  }
}

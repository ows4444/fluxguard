import type { ConsumeResult, PeekResult, RuntimeFailureEvent } from '@fluxguard/contracts';

import { RuntimeInfrastructureError } from '../../../errors';
import type { RuntimeHealthMonitor } from '../../state';
import type { RuntimeExecutionPipeline } from '../pipeline/runtime-execution-pipeline.interface';
import type { RuntimeExecutionContext } from '../runtime-execution-context';
import { RuntimeCircuitBreakerOpenError } from './runtime-circuit-breaker.error';
import { RuntimeCircuitBreakerService } from './runtime-circuit-breaker.service';
import { RuntimeDegradationService } from './runtime-degradation.service';
import { RuntimeFailPolicyService } from './runtime-fail-policy.service';
import { RuntimeLatencyMonitor } from './runtime-latency.monitor';
import { RuntimeTimeoutError, RuntimeTimeoutService } from './runtime-timeout.service';

export interface RuntimeResiliencePipelineOptions {
  readonly pipeline: RuntimeExecutionPipeline;

  readonly health: RuntimeHealthMonitor;

  readonly onFailure?: (event: RuntimeFailureEvent) => void;
}

export class RuntimeResiliencePipeline implements RuntimeExecutionPipeline {
  readonly #pipeline: RuntimeExecutionPipeline;

  readonly #health: RuntimeHealthMonitor;

  readonly #onFailure: ((event: RuntimeFailureEvent) => void) | undefined;

  readonly #timeout = new RuntimeTimeoutService();

  readonly #degradation = new RuntimeDegradationService();

  readonly #policy = new RuntimeFailPolicyService();

  readonly #breaker = new RuntimeCircuitBreakerService({
    failureThreshold: 5,
    recoveryTimeMs: 10_000,
  });

  readonly #latency = new RuntimeLatencyMonitor({
    sampleSize: 100,

    degradedThresholdMs: 250,

    openThresholdMs: 1000,
  });

  constructor(options: RuntimeResiliencePipelineOptions) {
    this.#pipeline = options.pipeline;

    this.#health = options.health;

    this.#onFailure = options.onFailure;
  }

  async consume(context: RuntimeExecutionContext): Promise<ConsumeResult> {
    const started = performance.now();

    try {
      if (!this.#breaker.canExecute()) {
        throw new RuntimeCircuitBreakerOpenError();
      }

      if (this.#latency.shouldOpen()) {
        throw new RuntimeCircuitBreakerOpenError();
      }

      const result = await this.#timeout.execute(
        () => this.#pipeline.consume(context),
        context.definition.descriptor.execution.timeoutMs,
      );

      this.#latency.record(performance.now() - started);

      this.#breaker.success();

      return result;
    } catch (error) {
      const durationMs = performance.now() - started;

      this.#latency.record(durationMs);

      if (this.isInfrastructureFailure(error)) {
        this.#breaker.failure();
      }

      this.#onFailure?.({
        limiter: context.definition.name,

        key: context.key,

        reason: error instanceof Error ? error.message : 'UNKNOWN',

        timestamp: Date.now(),

        durationMs: Date.now() - context.startedAt,
      });

      const failOpen = this.#policy.shouldAllowOnFailure(context.definition.descriptor.resilience.failBehavior);

      if (failOpen) {
        const allowance = context.definition.descriptor.resilience.degradedAllowancePerSecond;

        const allowed = this.#degradation.shouldAllow(context.definition.name, context.key, allowance);

        if (!allowed) {
          return this.#degradation.createRejectedResult(context.key);
        }

        return this.#degradation.createAllowedResult(context.key);
      }

      if (this.#breaker.isOpen()) {
        this.#health.markOpen('CIRCUIT_BREAKER_OPEN');
      } else {
        this.#health.markDegraded(error instanceof Error ? error.message : 'RUNTIME_FAILURE');
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

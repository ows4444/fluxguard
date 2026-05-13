import type { ConsumeResult, PeekResult } from '@fluxguard/contracts';

import type { RuntimeExecutionPipeline } from '../pipeline/runtime-execution-pipeline.interface';
import type { RuntimeExecutionContext } from '../runtime-execution-context';
import { RuntimeCircuitBreakerOpenError } from './runtime-circuit-breaker.error';
import { RuntimeCircuitBreakerService } from './runtime-circuit-breaker.service';
import { RuntimeDegradationService } from './runtime-degradation.service';
import { RuntimeFailPolicyService } from './runtime-fail-policy.service';
import { RuntimeTimeoutService } from './runtime-timeout.service';

export interface RuntimeResiliencePipelineOptions {
  readonly pipeline: RuntimeExecutionPipeline;
}
export class RuntimeResiliencePipeline implements RuntimeExecutionPipeline {
  readonly #pipeline: RuntimeExecutionPipeline;

  readonly #timeout = new RuntimeTimeoutService();

  readonly #degradation = new RuntimeDegradationService();

  readonly #policy = new RuntimeFailPolicyService();

  readonly #breaker = new RuntimeCircuitBreakerService({
    failureThreshold: 5,
    recoveryTimeMs: 10_000,
  });

  constructor(options: RuntimeResiliencePipelineOptions) {
    this.#pipeline = options.pipeline;
  }

  async consume(context: RuntimeExecutionContext): Promise<ConsumeResult> {
    try {
      if (!this.#breaker.canExecute()) {
        throw new RuntimeCircuitBreakerOpenError();
      }

      const result = await this.#timeout.execute(
        this.#pipeline.consume(context),
        context.definition.descriptor.execution.timeoutMs,
      );

      this.#breaker.success();

      return result;
    } catch {
      this.#breaker.failure();

      options.onFailure?.({
        limiter: context.definition.name,

        key: context.key,

        reason: error instanceof Error ? error.message : 'UNKNOWN',

        timestamp: Date.now(),

        durationMs: Date.now() - context.startedAt,
      });

      const failOpen = this.#policy.shouldAllowOnFailure(context.definition.descriptor.resilience.failBehavior);

      if (failOpen) {
        return this.#degradation.createAllowedResult(context.key);
      }

      return this.#degradation.createRejectedResult(context.key);
    }
  }

  async peek(context: RuntimeExecutionContext): Promise<PeekResult> {
    return this.#pipeline.peek(context);
  }
}

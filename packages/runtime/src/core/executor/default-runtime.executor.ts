import type { ConsumeResult, PeekResult } from '@fluxguard/contracts';

import type { RuntimeExecutionContext } from '../../execution/index';
import type { RuntimeExecutionPipeline } from '../../execution/pipeline/runtime-execution-pipeline.interface';
import type { RuntimeConsumeRequest, RuntimeExecutor, RuntimePeekRequest } from './runtime-executor.interface';

export interface DefaultRuntimeExecutorOptions {
  readonly pipeline: RuntimeExecutionPipeline;
}

export class DefaultRuntimeExecutor implements RuntimeExecutor {
  readonly #pipeline: RuntimeExecutionPipeline;

  constructor(options: DefaultRuntimeExecutorOptions) {
    this.#pipeline = options.pipeline;
  }

  async consume(request: RuntimeConsumeRequest): Promise<ConsumeResult> {
    const context = this.createExecutionContext(request);

    return this.#pipeline.consume(context);
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

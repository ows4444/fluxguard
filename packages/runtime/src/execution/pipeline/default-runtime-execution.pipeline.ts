import type { ConsumeResult, PeekResult } from '@fluxguard/contracts';

import type { RuntimeAlgorithm } from '../../algorithms/index';
import { RuntimeDecisionMapper } from '../mappers/runtime-decision.mapper';
import type { RuntimeExecutionContext, RuntimeExecutionResult } from '../runtime-execution-context';
import type { RuntimeExecutionPipeline } from './runtime-execution-pipeline.interface';

export interface DefaultRuntimeExecutionPipelineOptions {
  readonly algorithm: RuntimeAlgorithm;
}

export class DefaultRuntimeExecutionPipeline implements RuntimeExecutionPipeline {
  readonly #algorithm: RuntimeAlgorithm;

  readonly #mapper: RuntimeDecisionMapper;

  constructor(options: DefaultRuntimeExecutionPipelineOptions) {
    this.#algorithm = options.algorithm;

    this.#mapper = new RuntimeDecisionMapper();
  }

  async consume(context: RuntimeExecutionContext): Promise<ConsumeResult> {
    const algorithm = await this.#algorithm.consume(context.key);

    const execution: RuntimeExecutionResult = {
      context,
      algorithm,
    };

    return this.#mapper.toConsumeResult(execution);
  }

  async peek(context: RuntimeExecutionContext): Promise<PeekResult> {
    const algorithm = await this.#algorithm.peek(context.key);

    const execution: RuntimeExecutionResult = {
      context,
      algorithm,
    };

    return this.#mapper.toPeekResult(execution);
  }
}

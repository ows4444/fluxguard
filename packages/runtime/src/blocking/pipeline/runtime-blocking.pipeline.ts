import type { ConsumeResult, PeekResult } from '@fluxguard/contracts';

import type { RuntimeExecutionPipeline } from '../../execution/pipeline/runtime-execution-pipeline.interface';
import type { RuntimeExecutionContext } from '../../execution/runtime-execution-context';
import { blockedResult, isRejected } from '../../results/index';
import type { RuntimeStore } from '../../storage/contracts/index';
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
    const blockKey = `${context.key}:block`;

    const violationKey = `${context.key}:violations`;

    const activeBlock = await this.#blocking.getBlock(blockKey);

    if (activeBlock) {
      return blockedResult(context.key, 0, activeBlock.expiresAt - Date.now());
    }

    const result = await this.#pipeline.consume(context);

    if (!isRejected(result)) {
      return result;
    }

    const ttlMs = (context.definition.compiled.progressiveBlocking?.violationTtlSeconds ?? 60) * 1000;

    const violations = await this.#violations.increment(violationKey, ttlMs);

    const duration = await this.#blocking.block(
      blockKey,
      violations,
      context.definition.compiled.blocking,
      context.definition.compiled.progressiveBlocking,
    );

    if (duration <= 0) {
      return result;
    }

    return blockedResult(context.key, 0, duration);
  }

  async peek(context: RuntimeExecutionContext): Promise<PeekResult> {
    return this.#pipeline.peek(context);
  }
}

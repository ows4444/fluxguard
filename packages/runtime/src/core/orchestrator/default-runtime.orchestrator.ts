import type { ConsumeResult, PeekResult, RateLimitContext } from '@fluxguard/contracts';

import { UnknownLimiterError } from '../../errors/index';
import type { RuntimeExecutor } from '../executor/index';
import { buildRuntimeKey } from '../identity/key-builder';
import type { RuntimeRegistry } from '../registry/runtime-registry';
import type { RuntimeOrchestrator } from './runtime-orchestrator.interface';

export class DefaultRuntimeOrchestrator implements RuntimeOrchestrator {
  readonly #registry: RuntimeRegistry;

  readonly #executor: RuntimeExecutor;

  constructor(registry: RuntimeRegistry, executor: RuntimeExecutor) {
    this.#registry = registry;
    this.#executor = executor;
  }

  async consume(limiterName: string, context: RateLimitContext): Promise<ConsumeResult> {
    const definition = this.#registry.get(limiterName);

    if (!definition) {
      throw new UnknownLimiterError(limiterName);
    }

    const key = buildRuntimeKey(definition.name, context, definition.descriptor.identity);

    return this.#executor.consume({
      definition,
      context,
      key,
    });
  }

  async peek(limiterName: string, context: RateLimitContext): Promise<PeekResult> {
    const definition = this.#registry.get(limiterName);

    if (!definition) {
      throw new UnknownLimiterError(limiterName);
    }

    const key = buildRuntimeKey(definition.name, context, definition.descriptor.identity);

    return this.#executor.peek({
      definition,
      context,
      key,
    });
  }
}

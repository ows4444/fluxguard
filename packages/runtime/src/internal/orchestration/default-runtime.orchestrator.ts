import type { ConsumeResult, PeekResult, RateLimitContext } from '@fluxguard/contracts';

import { buildRuntimeKey } from '../../core/identity/key-builder';
import { UnknownLimiterError } from '../../errors/index';
import type { RuntimeRegistry } from '../registry/runtime-registry';
import type { RuntimeExecutorRouter, RuntimeOrchestrator } from './runtime-orchestrator.interface';

export class DefaultRuntimeOrchestrator implements RuntimeOrchestrator {
  readonly #registry: RuntimeRegistry;

  readonly #router: RuntimeExecutorRouter;

  constructor(registry: RuntimeRegistry, router: RuntimeExecutorRouter) {
    this.#registry = registry;

    this.#router = router;
  }

  async consume(limiterName: string, context: RateLimitContext): Promise<ConsumeResult> {
    const definition = this.#registry.get(limiterName);

    if (!definition) {
      throw new UnknownLimiterError(limiterName);
    }

    const key = buildRuntimeKey(definition.name, context, definition.descriptor.identity);

    return this.#router.consume({
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

    return this.#router.peek({
      definition,
      context,
      key,
    });
  }
}

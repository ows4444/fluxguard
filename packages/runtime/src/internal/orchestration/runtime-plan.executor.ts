import { type ConsumeResult, type PeekResult, type RateLimitContext } from '@fluxguard/contracts';

import type { RuntimeLimiterDefinition } from '../../core';
import type { RuntimeExecutor } from '../../core/executor';
import { buildRuntimeKey } from '../../core/identity/key-builder';
import { isAllowed, shouldStopExecution } from '../../results';
import { RuntimeConcurrencyManager } from '../concurrency';
import { RuntimeGraphCompiler } from '../graph';
import { RuntimeHotKeyDetector } from '../hotkeys';

export interface RuntimeExecutorResolver {
  getExecutor(limiter: string): RuntimeExecutor;
}

export class RuntimePlanExecutor {
  readonly #resolver: RuntimeExecutorResolver;

  readonly #concurrency = new RuntimeConcurrencyManager();

  readonly #hotkeys = new RuntimeHotKeyDetector({
    threshold: 500,
    windowMs: 1000,
    suppressionMs: 250,
  });

  readonly #graphs = new RuntimeGraphCompiler();

  constructor(resolver: RuntimeExecutorResolver) {
    this.#resolver = resolver;
  }

  async consume(definitions: readonly RuntimeLimiterDefinition[], context: RateLimitContext): Promise<ConsumeResult> {
    const graph = this.#graphs.compile(definitions);

    let finalResult: ConsumeResult | null = null;

    for (const node of graph.nodes) {
      const definition = node.limiter;

      if (!definition.descriptor.execution.enabled) {
        continue;
      }

      const executor = this.#resolver.getExecutor(definition.name);

      const key = buildRuntimeKey(definition.name, context, definition.descriptor.identity);

      this.#hotkeys.register(key);

      const execute = async () =>
        executor.consume({
          definition,
          context,
          key,
        });

      const concurrencyGroup = node.concurrencyGroup;

      const result = concurrencyGroup ? await this.#concurrency.execute(concurrencyGroup, execute) : await execute();

      finalResult = result;

      if (shouldStopExecution(result)) {
        return result;
      }
    }

    if (!finalResult) {
      throw new Error('Execution plan resolved no limiters');
    }

    return finalResult;
  }

  async peek(definitions: readonly RuntimeLimiterDefinition[], context: RateLimitContext): Promise<PeekResult> {
    const graph = this.#graphs.compile(definitions);

    for (const node of graph.nodes) {
      const definition = node.limiter;

      if (!definition.descriptor.execution.enabled) {
        continue;
      }

      const executor = this.#resolver.getExecutor(definition.name);

      const key = buildRuntimeKey(definition.name, context, definition.descriptor.identity);

      this.#hotkeys.register(key);

      const execute = async () =>
        executor.peek({
          definition,
          context,
          key,
        });

      const concurrencyGroup = node.concurrencyGroup;

      const result = concurrencyGroup ? await this.#concurrency.execute(concurrencyGroup, execute) : await execute();

      if (!isAllowed(result)) {
        return result;
      }
    }

    const last = graph.nodes[graph.nodes.length - 1]?.limiter;

    if (!last) {
      throw new Error('Execution plan resolved no limiters');
    }

    const executor = this.#resolver.getExecutor(last.name);

    const key = buildRuntimeKey(last.name, context, last.descriptor.identity);

    this.#hotkeys.register(key);

    const execute = async () =>
      executor.peek({
        definition: last,
        context,
        key,
      });

    const concurrencyGroup = last.descriptor.execution.concurrencyGroup;

    return concurrencyGroup ? this.#concurrency.execute(concurrencyGroup, execute) : execute();
  }
}

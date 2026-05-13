import type { ConsumeResult, PeekResult, RateLimitConfig, RateLimitContext } from '@fluxguard/contracts';

import { RuntimeBlockingPipeline } from '../../blocking/index';
import { RuntimeDefinitionCompiler } from '../../compiler/index';
import type { RuntimeLimiterConfig } from '../../config/index';
import { RuntimeExecutionError } from '../../errors/index';
import { RuntimeResiliencePipeline } from '../../execution/index';
import { DefaultRuntimeExecutionPipeline } from '../../execution/pipeline/index';
import { RuntimeAlgorithmFactory } from '../../factories/index';
import type { RuntimeStore } from '../../storage/contracts/index';
import { DefaultRuntimeExecutor } from '../executor/index';
import type { RuntimeExecutor } from '../executor/runtime-executor.interface';
import { DefaultRuntimeOrchestrator } from '../orchestrator/index';
import { RuntimeRegistry } from '../registry/runtime-registry';
import type { RuntimeLimiterDefinition } from './runtime-limiter.definition';

export interface RuntimeEngineOptions {
  readonly storage: RuntimeStore;
}

export class RuntimeEngine {
  readonly #registry: RuntimeRegistry;

  readonly #compiler: RuntimeDefinitionCompiler;

  readonly #algorithmFactory: RuntimeAlgorithmFactory;

  readonly #storage: RuntimeStore;

  readonly #executors = new Map<string, RuntimeExecutor>();

  readonly #orchestrator: DefaultRuntimeOrchestrator;

  constructor(options: RuntimeEngineOptions) {
    this.#storage = options.storage;

    this.#registry = new RuntimeRegistry();

    this.#compiler = new RuntimeDefinitionCompiler();

    this.#algorithmFactory = new RuntimeAlgorithmFactory();

    this.#orchestrator = new DefaultRuntimeOrchestrator(this.#registry, {
      consume: async (request) => {
        const executor = this.getExecutor(request.definition.name);

        return executor.consume(request);
      },

      peek: async (request) => {
        const executor = this.getExecutor(request.definition.name);

        return executor.peek(request);
      },
    });
  }

  register(name: string, config: RateLimitConfig): RuntimeLimiterDefinition {
    const definition = this.#compiler.compile(name, config);

    const executor = this.createExecutor(definition.compiled.runtime);

    this.#registry.register(definition);

    this.#executors.set(name, executor);

    return definition;
  }

  async consume(limiterName: string, context: RateLimitContext): Promise<ConsumeResult> {
    return this.#orchestrator.consume(limiterName, context);
  }

  async peek(limiterName: string, context: RateLimitContext): Promise<PeekResult> {
    return this.#orchestrator.peek(limiterName, context);
  }

  getDefinition(name: string): RuntimeLimiterDefinition | undefined {
    return this.#registry.get(name);
  }

  getDefinitions(): readonly RuntimeLimiterDefinition[] {
    return this.#registry.getAll();
  }

  private createExecutor(config: RuntimeLimiterConfig): RuntimeExecutor {
    const algorithm = this.#algorithmFactory.create(config, this.#storage);

    const executionPipeline = new DefaultRuntimeExecutionPipeline({
      algorithm,
    });

    const resiliencePipeline = new RuntimeResiliencePipeline({
      pipeline: executionPipeline,
    });

    const blockingPipeline = new RuntimeBlockingPipeline({
      store: this.#storage,

      pipeline: resiliencePipeline,
    });

    return new DefaultRuntimeExecutor({
      pipeline: blockingPipeline,
    });
  }

  private getExecutor(name: string): RuntimeExecutor {
    const executor = this.#executors.get(name);

    if (!executor) {
      throw new RuntimeExecutionError(`Missing runtime executor for limiter: ${name}`);
    }

    return executor;
  }
}

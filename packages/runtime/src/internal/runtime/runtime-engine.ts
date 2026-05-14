import type {
  ConsumeResult,
  PeekResult,
  RateLimitAdjustmentOptions,
  RateLimitConfig,
  RateLimitContext,
} from '@fluxguard/contracts';

import { RuntimeAdjustmentService } from '../../adjustments/runtime-adjustment.service';
import type { RuntimeLimiterConfig } from '../../config';
import type { RuntimeEngineContract } from '../../core/engine/runtime-engine.interface';
import type { RuntimeLimiterDefinition } from '../../core/engine/runtime-limiter.definition';
import type { RuntimeExecutor } from '../../core/executor';
import { DefaultRuntimeExecutor } from '../../core/executor';
import { buildRuntimeKey } from '../../core/identity/key-builder';
import { RuntimeExecutionError } from '../../errors';
import { RuntimeEventBus } from '../../events';
import type { RuntimeStore } from '../../storage/contracts';
import {
  RedisRuntimeClock,
  type RuntimeClock,
  type RuntimeMonotonicClock,
  SystemMonotonicClock,
  SystemRuntimeClock,
} from '../../time';
import { RuntimeBlockingPipeline } from '../blocking';
import { RuntimeDefinitionCompiler } from '../compiler';
import { DefaultRuntimeExecutionPipeline, RuntimeResiliencePipeline } from '../execution';
import { RuntimeResilienceState } from '../execution/resilience/runtime-resilience.state';
import { RuntimeAlgorithmFactory } from '../factories';
import { DefaultRuntimeOrchestrator } from '../orchestration';
import { RuntimePlanExecutor } from '../orchestration/runtime-plan.executor';
import { RuntimeRegistry } from '../registry/runtime-registry';
import { RuntimeStoreHealthMonitor } from '../state';
import { RuntimeEngineDestroyedError } from './runtime-engine.errors';

export interface RuntimeEngineOptions {
  readonly storage: RuntimeStore;

  readonly events?: RuntimeEventBus;
}

export class RuntimeEngine implements RuntimeEngineContract {
  readonly #shutdown = new AbortController();

  #destroyed = false;

  readonly #registry: RuntimeRegistry;

  readonly #compiler: RuntimeDefinitionCompiler;

  readonly #algorithmFactory: RuntimeAlgorithmFactory;

  readonly #events: RuntimeEventBus;
  readonly #storage: RuntimeStore;

  readonly #resilienceStates = new Map<string, RuntimeResilienceState>();

  readonly #adjustments: RuntimeAdjustmentService;

  readonly #executors = new Map<string, RuntimeExecutor>();

  readonly #executionPlans = new Map<string, readonly RuntimeLimiterDefinition[]>();

  readonly #orchestrator: DefaultRuntimeOrchestrator;

  readonly #planExecutor: RuntimePlanExecutor;

  readonly #health: RuntimeStoreHealthMonitor;

  readonly #clock: RuntimeClock;

  readonly #monotonicClock: RuntimeMonotonicClock;

  constructor(options: RuntimeEngineOptions) {
    this.#storage = options.storage;
    this.#events = options.events ?? new RuntimeEventBus();

    this.#clock =
      typeof this.#storage.now === 'function' ? new RedisRuntimeClock(this.#storage) : new SystemRuntimeClock();

    this.#monotonicClock = new SystemMonotonicClock();

    this.#adjustments = new RuntimeAdjustmentService({
      storage: this.#storage,
    });

    this.#registry = new RuntimeRegistry();

    this.#compiler = new RuntimeDefinitionCompiler();

    this.#algorithmFactory = new RuntimeAlgorithmFactory();

    this.#health = new RuntimeStoreHealthMonitor({
      storage: this.#storage,
      events: this.#events,
    });

    this.#orchestrator = new DefaultRuntimeOrchestrator(this.#registry, {
      consume: async (request) => {
        this.ensureActive();
        const executor = this.getExecutor(request.definition.name);

        return executor.consume({
          ...request,
          signal: this.composeSignal(request.signal),
        });
      },

      peek: async (request) => {
        this.ensureActive();
        const executor = this.getExecutor(request.definition.name);

        return executor.peek({
          ...request,
          signal: this.composeSignal(request.signal),
        });
      },
    });
    this.#planExecutor = new RuntimePlanExecutor({
      getExecutor: (name) => this.getExecutor(name),
    });
  }

  async initialize(): Promise<void> {
    await this.#storage.initialize?.();
  }

  async dispose(): Promise<void> {
    this.#executors.clear();
  }

  async checkHealth(): Promise<void> {
    await this.#health.check();
  }

  getRuntimeState() {
    return this.#health.state;
  }

  async adjust(limiterName: string, context: RateLimitContext, options: RateLimitAdjustmentOptions): Promise<void> {
    const definition = this.#registry.getOrThrow(limiterName);

    const key = buildRuntimeKey(definition.name, context, definition.descriptor.identity);

    await this.#adjustments.adjust(definition, key, options);
  }

  register(name: string, config: RateLimitConfig): RuntimeLimiterDefinition {
    const definition = this.#compiler.compile(name, config);

    const executor = this.createExecutor(definition.name, definition.compiled.runtime);

    this.#registry.register(definition);

    this.#executors.set(name, executor);

    return definition;
  }

  registerPlan(name: string, limiters: readonly string[]): void {
    const resolved = limiters.map((limiter) => this.#registry.getOrThrow(limiter));

    this.#executionPlans.set(name, resolved);
  }

  async consume(limiterName: string, context: RateLimitContext): Promise<ConsumeResult> {
    return this.#orchestrator.consume(limiterName, context);
  }

  async peek(limiterName: string, context: RateLimitContext): Promise<PeekResult> {
    return this.#orchestrator.peek(limiterName, context);
  }

  async consumeMany(limiterNames: readonly string[], context: RateLimitContext): Promise<ConsumeResult> {
    const definitions = limiterNames.map((name) => this.#registry.getOrThrow(name));

    return this.#planExecutor.consume(definitions, context);
  }

  async consumePlan(plan: string, context: RateLimitContext): Promise<ConsumeResult> {
    const definitions = this.#executionPlans.get(plan);

    if (!definitions) {
      throw new RuntimeExecutionError(`Unknown execution plan: ${plan}`);
    }

    return this.#planExecutor.consume(definitions, context);
  }

  async peekPlan(plan: string, context: RateLimitContext): Promise<PeekResult> {
    const definitions = this.#executionPlans.get(plan);

    if (!definitions) {
      throw new RuntimeExecutionError(`Unknown execution plan: ${plan}`);
    }

    return this.#planExecutor.peek(definitions, context);
  }

  async peekMany(limiterNames: readonly string[], context: RateLimitContext): Promise<PeekResult> {
    const definitions = limiterNames.map((name) => this.#registry.getOrThrow(name));

    return this.#planExecutor.peek(definitions, context);
  }

  getDefinition(name: string): RuntimeLimiterDefinition | undefined {
    return this.#registry.get(name);
  }

  getDefinitions(): readonly RuntimeLimiterDefinition[] {
    return this.#registry.getAll();
  }

  private createExecutor(limiterName: string, config: RuntimeLimiterConfig): RuntimeExecutor {
    const algorithm = this.#algorithmFactory.create(config, this.#storage);

    const resilienceState = new RuntimeResilienceState();

    this.#resilienceStates.set(limiterName, resilienceState);

    const executionPipeline = new DefaultRuntimeExecutionPipeline({
      algorithm,
    });

    const resiliencePipeline = new RuntimeResiliencePipeline({
      pipeline: executionPipeline,

      health: this.#health,

      state: resilienceState,

      monotonicNow: () => this.#monotonicClock.now(),

      wallClockNow: () => Date.now(),

      onFailure: (event) => {
        this.#events.emitFailure(event);
      },
    });

    const blockingPipeline = new RuntimeBlockingPipeline({
      store: this.#storage,

      pipeline: resiliencePipeline,
    });

    return new DefaultRuntimeExecutor({
      pipeline: blockingPipeline,

      events: this.#events,

      clock: this.#clock,

      monotonicClock: this.#monotonicClock,
    });
  }

  getLimiterState(limiterName: string): {
    readonly degraded: boolean;
    readonly open: boolean;
  } | null {
    const state = this.#resilienceStates.get(limiterName);

    if (!state) {
      return null;
    }

    return {
      degraded: state.isDegraded(),
      open: state.isOpen(),
    };
  }

  async destroy(): Promise<void> {
    if (this.#destroyed) {
      return;
    }

    this.#destroyed = true;
    this.#shutdown.abort(new RuntimeEngineDestroyedError());

    for (const state of this.#resilienceStates.values()) {
      state.destroy();
    }

    this.#resilienceStates.clear();
    this.#executors.clear();
  }

  private ensureActive(): void {
    if (this.#destroyed) {
      throw new RuntimeEngineDestroyedError();
    }
  }

  private getExecutor(name: string): RuntimeExecutor {
    const executor = this.#executors.get(name);

    if (!executor) {
      throw new RuntimeExecutionError(`Missing runtime executor for limiter: ${name}`);
    }

    return executor;
  }

  private composeSignal(signal?: AbortSignal): AbortSignal {
    if (!signal) {
      return this.#shutdown.signal;
    }

    return AbortSignal.any([signal, this.#shutdown.signal]);
  }
}

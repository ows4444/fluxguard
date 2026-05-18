import {
  assertValidRateLimitKey,
  type ConsumeCommand,
  durationBetweenMonotonicTimestamps,
  durationMilliseconds,
  type MonotonicClock,
  type PeekCommand,
  type PeekResult,
  type RateLimitDecision,
  RateLimiterUnsupportedOperationError,
  type RuntimeCapabilities,
  type RuntimeHealthStatus,
  type RuntimeMetadata,
  type RuntimeObserver,
  type RuntimeStore,
  type ShutdownOptions,
  validateRuntimeCapabilities,
} from '@fluxguard/contracts';
import {
  assertNotAborted,
  composeAbortSignals,
  mapRuntimeError,
  RuntimeLifecycleError,
  withTimeout,
} from '@fluxguard/runtime';

import { type CooldownConsumeDependencies } from '../cooldown';
import { type FixedWindowConsumeDependencies, type GcraConsumeDependencies } from '../quota';
import { MEMORY_RUNTIME_LIMITS } from './runtime.constants';
import { dispatchConsume } from './runtime-dispatch';
import { createDecisionEvent, createFailureEvent } from './runtime-event.factories';
import { type ObserverDiagnostics, safelyExecuteObserver } from './runtime-observer.utils';
import { assertRuntimeActive } from './runtime-state.guards';
import { RUNTIME_STATE, type RuntimeState } from './runtime-state.types';

const MEMORY_RUNTIME_CAPABILITIES: RuntimeCapabilities = Object.freeze({
  cooperativeCancellation: false,
  adjustments: false,
  singleProcessSerializedConsumption: true,
  consistentPeek: false,
  distributed: false,
  strongConsistency: false,
});

validateRuntimeCapabilities(MEMORY_RUNTIME_CAPABILITIES);

export interface MemoryRuntimeStoreDependencies extends CooldownConsumeDependencies, FixedWindowConsumeDependencies {
  readonly clock: MonotonicClock;

  readonly gcraStorage: GcraConsumeDependencies['gcraStorage'];

  readonly observer?: RuntimeObserver;

  readonly observerDiagnostics?: ObserverDiagnostics;
}

export class MemoryRuntimeStore implements RuntimeStore {
  private readonly shutdownController = new AbortController();

  private acquireOperationLease(): () => void {
    assertRuntimeActive(this.state);

    this.inflightOperations++;

    return () => {
      this.releaseOperationLease();
    };
  }

  private releaseOperationLease(): void {
    if (this.inflightOperations === 0) {
      throw new Error('Invariant violation: inflightOperations cannot be negative');
    }

    this.inflightOperations -= 1;

    if (this.inflightOperations === 0) {
      for (const resolve of this.drainResolvers) {
        resolve();
      }

      this.drainResolvers = [];
    }
  }

  readonly metadata: RuntimeMetadata = {
    name: 'runtime-memory',
  };

  private state: RuntimeState = RUNTIME_STATE.ACTIVE;

  private shutdownPromise?: Promise<void>;

  private drainResolvers: Array<() => void> = [];
  private inflightOperations = 0;

  readonly capabilities = MEMORY_RUNTIME_CAPABILITIES;

  constructor(private readonly dependencies: MemoryRuntimeStoreDependencies) {}

  async consume(command: ConsumeCommand): Promise<RateLimitDecision> {
    command.signal?.throwIfAborted?.();

    const release = this.acquireOperationLease();

    const startedAt = this.dependencies.clock.now();
    const operationStartedAt = this.dependencies.clock.monotonicNow();

    try {
      assertValidRateLimitKey(command.key);

      const decision = await withTimeout(
        'consume',
        (timeoutSignal) => {
          const composed = composeAbortSignals([
            timeoutSignal,
            this.shutdownController.signal,
            ...(command.signal ? [command.signal] : []),
          ]);

          return Promise.resolve(
            this.executeConsume({
              ...command,
              signal: composed.signal,
            }),
          ).finally(() => {
            composed.cleanup();
          });
        },
        command.config.executionTimeoutMs,
      );

      const elapsedMs = durationBetweenMonotonicTimestamps(this.dependencies.clock.monotonicNow(), operationStartedAt);

      safelyExecuteObserver(
        () => {
          this.dependencies.observer?.onDecision?.(
            createDecisionEvent({
              timestamp: startedAt,
              durationMs: elapsedMs,
              limiterName: this.metadata.name,
              key: command.key,
              kind: command.config.kind,
              decision,
              correlationId: command.correlationId,
            }),
          );
        },
        this.dependencies.observerDiagnostics,
        {
          operation: 'consume',
          correlationId: command.correlationId,
          key: command.key,
        },
      );

      return decision;
    } catch (error) {
      const elapsedMs = durationBetweenMonotonicTimestamps(this.dependencies.clock.monotonicNow(), operationStartedAt);

      safelyExecuteObserver(
        () => {
          this.dependencies.observer?.onFailure?.(
            createFailureEvent({
              timestamp: this.dependencies.clock.now(),
              durationMs: elapsedMs,
              limiterName: this.metadata.name,
              key: command.key,
              reason: error instanceof Error ? error.message : 'Unknown runtime failure',
            }),
          );
        },
        this.dependencies.observerDiagnostics,
        {
          operation: 'consume',
          correlationId: command.correlationId,
          key: command.key,
        },
      );

      throw mapRuntimeError(error);
    } finally {
      release();
    }
  }

  private executeConsume(command: ConsumeCommand): RateLimitDecision {
    assertNotAborted(command.signal);
    return dispatchConsume(command, this.dependencies);
  }

  async peek(_command: PeekCommand): Promise<PeekResult> {
    assertRuntimeActive(this.state);

    try {
      throw new RateLimiterUnsupportedOperationError('Peek is not implemented for runtime-memory');
    } catch (error) {
      throw mapRuntimeError(error);
    }
  }

  async health(): Promise<RuntimeHealthStatus> {
    if (this.state === RUNTIME_STATE.SHUTDOWN) {
      return {
        healthy: false,
        degraded: true,
        reason: 'Runtime has been shut down',
      };
    }

    try {
      const totalEntries =
        this.dependencies.cooldownStorage.size() +
        this.dependencies.quotaStorage.size() +
        this.dependencies.gcraStorage.size();

      return {
        healthy: true,
        degraded: totalEntries > MEMORY_RUNTIME_LIMITS.STORAGE_PRESSURE_THRESHOLD,
        ...(totalEntries > MEMORY_RUNTIME_LIMITS.STORAGE_PRESSURE_THRESHOLD
          ? { reason: 'High in-memory storage pressure detected' }
          : {}),
      };
    } catch (error) {
      throw mapRuntimeError(error);
    }
  }

  async shutdown(
    options: ShutdownOptions = {
      graceful: true,
      timeoutMs: durationMilliseconds(5000),
    },
  ): Promise<void> {
    if (this.shutdownPromise) {
      return this.shutdownPromise;
    }

    this.shutdownPromise = this.performShutdown(options);

    return this.shutdownPromise;
  }

  private async performShutdown(options?: ShutdownOptions): Promise<void> {
    if (this.state !== RUNTIME_STATE.ACTIVE) {
      return;
    }

    this.state = RUNTIME_STATE.SHUTTING_DOWN;

    this.shutdownController.abort(new RuntimeLifecycleError('Runtime shutting down'));

    try {
      if (this.inflightOperations > 0) {
        const drainPromise = new Promise<void>((resolve) => {
          this.drainResolvers.push(resolve);
        });

        await withTimeout('shutdown-drain', async () => drainPromise, options?.timeoutMs);
      }

      this.dependencies.cooldownStorage.shutdown?.();
      this.dependencies.quotaStorage.shutdown?.();
      this.dependencies.gcraStorage.shutdown?.();
    } catch (error) {
      throw mapRuntimeError(error);
    } finally {
      this.state = RUNTIME_STATE.SHUTDOWN;
    }
  }
}

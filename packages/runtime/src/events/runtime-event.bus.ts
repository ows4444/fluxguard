import { EventEmitter } from 'node:events';

import type {
  RuntimeDecisionEvent,
  RuntimeExecutionMetricsEvent,
  RuntimeFailureEvent,
  RuntimeStoreHealthEvent,
  RuntimeTracingEvent,
} from '@fluxguard/contracts';

export interface RuntimeEvents {
  decision: RuntimeDecisionEvent;

  failure: RuntimeFailureEvent;

  health: RuntimeStoreHealthEvent;

  metrics: RuntimeExecutionMetricsEvent;

  tracing: RuntimeTracingEvent;
}

export class RuntimeEventBus {
  readonly #emitter = new EventEmitter();

  constructor() {
    this.#emitter.setMaxListeners(100);
  }

  emitDecision(event: RuntimeDecisionEvent): void {
    this.#safeEmit('decision', event);
  }

  emitFailure(event: RuntimeFailureEvent): void {
    this.#safeEmit('failure', event);
  }

  emitHealth(event: RuntimeStoreHealthEvent): void {
    this.#safeEmit('health', event);
  }

  emitMetrics(event: RuntimeExecutionMetricsEvent): void {
    this.#safeEmit('metrics', event);
  }

  emitTracing(event: RuntimeTracingEvent): void {
    this.#safeEmit('tracing', event);
  }

  onDecision(listener: (event: RuntimeDecisionEvent) => void): () => void {
    this.#emitter.on('decision', listener);

    return () => {
      this.#emitter.off('decision', listener);
    };
  }

  onFailure(listener: (event: RuntimeFailureEvent) => void): () => void {
    this.#emitter.on('failure', listener);

    return () => {
      this.#emitter.off('failure', listener);
    };
  }

  onHealth(listener: (event: RuntimeStoreHealthEvent) => void): () => void {
    this.#emitter.on('health', listener);

    return () => {
      this.#emitter.off('health', listener);
    };
  }

  onMetrics(listener: (event: RuntimeExecutionMetricsEvent) => void): () => void {
    this.#emitter.on('metrics', listener);

    return () => {
      this.#emitter.off('metrics', listener);
    };
  }

  onTracing(listener: (event: RuntimeTracingEvent) => void): () => void {
    this.#emitter.on('tracing', listener);

    return () => {
      this.#emitter.off('tracing', listener);
    };
  }

  #safeEmit(event: keyof RuntimeEvents, payload: RuntimeEvents[keyof RuntimeEvents]): void {
    try {
      this.#emitter.emit(event, payload);
    } catch (error) {
      process.emitWarning(`RuntimeEventBus listener failure: ${event}`, {
        code: 'RUNTIME_EVENT_BUS_LISTENER_FAILURE',
        detail: error instanceof Error ? error.stack : String(error),
      });
    }
  }
}

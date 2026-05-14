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
    this.#emitter.emit('decision', event);
  }

  emitFailure(event: RuntimeFailureEvent): void {
    this.#emitter.emit('failure', event);
  }

  emitHealth(event: RuntimeStoreHealthEvent): void {
    this.#emitter.emit('health', event);
  }

  emitMetrics(event: RuntimeExecutionMetricsEvent): void {
    this.#emitter.emit('metrics', event);
  }

  emitTracing(event: RuntimeTracingEvent): void {
    this.#emitter.emit('tracing', event);
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
}

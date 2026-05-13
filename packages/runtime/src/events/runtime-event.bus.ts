import { EventEmitter } from 'node:events';

import type { RuntimeDecisionEvent, RuntimeFailureEvent, RuntimeStoreHealthEvent } from '@fluxguard/contracts';

export interface RuntimeEvents {
  decision: RuntimeDecisionEvent;

  failure: RuntimeFailureEvent;

  health: RuntimeStoreHealthEvent;
}

export class RuntimeEventBus {
  readonly #emitter = new EventEmitter();

  emitDecision(event: RuntimeDecisionEvent): void {
    this.#emitter.emit('decision', event);
  }

  emitFailure(event: RuntimeFailureEvent): void {
    this.#emitter.emit('failure', event);
  }

  emitHealth(event: RuntimeStoreHealthEvent): void {
    this.#emitter.emit('health', event);
  }

  onDecision(listener: (event: RuntimeDecisionEvent) => void): void {
    this.#emitter.on('decision', listener);
  }

  onFailure(listener: (event: RuntimeFailureEvent) => void): void {
    this.#emitter.on('failure', listener);
  }

  onHealth(listener: (event: RuntimeStoreHealthEvent) => void): void {
    this.#emitter.on('health', listener);
  }
}

import type { RuntimeEventBus } from '../../events';
import type { RuntimeStore } from '../../storage';
import { RuntimeStateMachine } from './runtime-state.machine';

export interface RuntimeStoreHealthMonitorOptions {
  readonly storage: RuntimeStore;

  readonly events: RuntimeEventBus;
}

export class RuntimeStoreHealthMonitor {
  readonly #storage: RuntimeStore;

  readonly #events: RuntimeEventBus;

  readonly #machine = new RuntimeStateMachine();

  constructor(options: RuntimeStoreHealthMonitorOptions) {
    this.#storage = options.storage;

    this.#events = options.events;
  }

  get state() {
    return this.#machine.current;
  }

  isOpen(): boolean {
    return this.#machine.isTerminalOpen();
  }

  isDegraded(): boolean {
    return this.#machine.isDegraded();
  }

  isHealthy(): boolean {
    return this.#machine.isActive();
  }

  async check(): Promise<void> {
    const health = await this.#storage.health();

    this.#events.emitHealth({
      healthy: health.healthy,

      degraded: health.degraded ?? false,

      latencyMs: health.latencyMs,

      timestamp: Date.now(),

      ...(health.reason
        ? {
            reason: health.reason,
          }
        : {}),
    });

    if (!health.healthy) {
      this.#machine.transition('OPEN', health.reason ?? 'STORE_UNHEALTHY');

      return;
    }

    if (health.degraded) {
      this.#machine.transition('DEGRADED', health.reason ?? 'STORE_DEGRADED');

      return;
    }

    this.#machine.transition('ACTIVE', 'STORE_HEALTHY');
  }
}

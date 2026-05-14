import type { RuntimeEventBus } from '../../events';
import type { RuntimeStore } from '../../storage';
import { RuntimeStateMachine } from './runtime-state.machine';

export interface RuntimeHealthMonitorOptions {
  readonly storage: RuntimeStore;

  readonly events: RuntimeEventBus;
}

export class RuntimeHealthMonitor {
  readonly #storage: RuntimeStore;

  readonly #events: RuntimeEventBus;

  readonly #machine = new RuntimeStateMachine();

  constructor(options: RuntimeHealthMonitorOptions) {
    this.#storage = options.storage;

    this.#events = options.events;
  }

  get state() {
    return this.#machine.current;
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

  markDegraded(reason: string): void {
    this.#machine.transition('DEGRADED', reason);
  }

  markOpen(reason: string): void {
    this.#machine.transition('OPEN', reason);
  }

  markHealthy(): void {
    this.#machine.transition('ACTIVE', 'RUNTIME_HEALTHY');
  }
}

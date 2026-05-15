import { RuntimeCircuitBreakerService } from './runtime-circuit-breaker.service';
import { RuntimeDegradationService } from './runtime-degradation.service';
import { RuntimeLatencyMonitor } from './runtime-latency.monitor';

export class RuntimeResilienceState {
  static readonly MAX_DEGRADED_DURATION_MS = 120_000;

  readonly breaker: RuntimeCircuitBreakerService;

  readonly degradation = new RuntimeDegradationService();

  readonly latency = new RuntimeLatencyMonitor({
    sampleSize: 100,
    degradedThresholdMs: 250,
    openThresholdMs: 1000,
  });

  #degradedSince: number | null = null;

  readonly #monotonicNow: () => number;

  constructor(monotonicNow: () => number) {
    this.#monotonicNow = monotonicNow;

    this.breaker = new RuntimeCircuitBreakerService({
      failureThreshold: 5,
      recoveryTimeMs: 10_000,
      now: monotonicNow,
    });
  }

  beginDegradedPeriod(): void {
    if (this.#degradedSince !== null) {
      return;
    }

    this.#degradedSince = this.#monotonicNow();
  }

  endDegradedPeriod(): void {
    this.#degradedSince = null;
  }

  canUseDegradedMode(): boolean {
    if (this.#degradedSince === null) {
      return true;
    }

    return this.#monotonicNow() - this.#degradedSince <= RuntimeResilienceState.MAX_DEGRADED_DURATION_MS;
  }

  isOpen(): boolean {
    return this.breaker.isOpen();
  }

  isDegraded(): boolean {
    return this.latency.isDegraded();
  }

  destroy(): void {
    this.degradation.destroy();
  }
}

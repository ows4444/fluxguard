import { RuntimeCircuitBreakerService } from './runtime-circuit-breaker.service';
import { RuntimeDegradationService } from './runtime-degradation.service';
import { RuntimeLatencyMonitor } from './runtime-latency.monitor';

export class RuntimeResilienceState {
  readonly breaker = new RuntimeCircuitBreakerService({
    failureThreshold: 5,
    recoveryTimeMs: 10_000,
  });

  readonly degradation = new RuntimeDegradationService();

  readonly latency = new RuntimeLatencyMonitor({
    sampleSize: 100,
    degradedThresholdMs: 250,
    openThresholdMs: 1000,
  });

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

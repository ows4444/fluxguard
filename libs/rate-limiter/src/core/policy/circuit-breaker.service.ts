import { Injectable } from '@nestjs/common';
import { HybridClockService } from '../time/hybrid-clock.service';

interface BreakerState {
  failures: number;

  lastFailureAt: number;

  openedAt?: number;

  lastProbeAt?: number;

  halfOpenProbeInFlight: boolean;

  updatedAt: number;
}

@Injectable()
export class CircuitBreakerService {
  constructor(private readonly clock: HybridClockService) {}

  private readonly states = new Map<string, BreakerState>();

  private readonly MAX_STATES = 10_000;

  private cleanupCursor = 0;

  private readonly failureThreshold = 10;

  private readonly rollingWindowMs = 10_000;

  private readonly openDurationMs = 30_000;

  private readonly idleTtlMs = 300_000;

  isOpen(key: string, now = this.clock.nowMs()): boolean {
    if ((now & 255) === 0) {
      this.cleanup(now);
    }

    const state = this.states.get(key);

    if (!state?.openedAt) {
      return false;
    }

    if (now - state.openedAt >= this.openDurationMs) {
      delete state.openedAt;
      state.halfOpenProbeInFlight = false;

      return false;
    }

    return true;
  }

  allowProbe(key: string, now = this.clock.nowMs()): boolean {
    const state = this.getOrCreate(key, now);

    if (!state.openedAt) {
      return true;
    }

    if (state.halfOpenProbeInFlight) {
      return false;
    }

    if (state.lastProbeAt && now - state.lastProbeAt < 1000) {
      return false;
    }

    state.lastProbeAt = now;
    state.halfOpenProbeInFlight = true;

    return true;
  }

  recordSuccess(key: string): void {
    this.states.delete(key);
  }

  recordFailure(key: string, now: number): void {
    const state = this.getOrCreate(key, now);

    state.updatedAt = now;

    state.halfOpenProbeInFlight = false;

    if (now - state.lastFailureAt > this.rollingWindowMs) {
      state.failures = 0;
    }

    state.failures += 1;

    state.lastFailureAt = now;

    if (state.failures >= this.failureThreshold) {
      state.openedAt = now;
    }
  }

  private cleanup(now: number): void {
    if (this.states.size === 0) {
      return;
    }

    const keys = Array.from(this.states.keys());

    const batchSize = Math.min(32, keys.length);

    for (let i = 0; i < batchSize; i += 1) {
      const idx = this.cleanupCursor % keys.length;

      this.cleanupCursor += 1;

      const key = keys[idx];

      if (!key) {
        continue;
      }

      const state = this.states.get(key);

      if (!state) {
        continue;
      }

      if (now - state.updatedAt > this.idleTtlMs) {
        this.states.delete(key);
      }
    }
  }

  private getOrCreate(key: string, now: number): BreakerState {
    let state = this.states.get(key);

    if (!state) {
      if (this.states.size >= this.MAX_STATES) {
        this.cleanup(now);
      }

      state = {
        failures: 0,

        lastFailureAt: 0,

        halfOpenProbeInFlight: false,

        updatedAt: now,
      };

      if (this.states.size >= this.MAX_STATES) {
        return state;
      }

      this.states.set(key, state);
    }

    return state;
  }
}

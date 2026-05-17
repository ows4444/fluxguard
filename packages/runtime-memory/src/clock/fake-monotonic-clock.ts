import type { MonotonicClock, MonotonicTimestampMs, RuntimeTimeSnapshot, UnixTimestampMs } from '@fluxguard/contracts';
import { monotonicTimestampMs, safeIntegerAdd, unixTimestampMs } from '@fluxguard/contracts';

export interface FakeClockOptions {
  readonly startMonotonicMs?: number;
  readonly startTimeMs?: number;
}

export class FakeMonotonicClock implements MonotonicClock {
  private wallClockMs: number;

  private monotonicMs: number;

  constructor(options: FakeClockOptions = {}) {
    this.wallClockMs = options.startTimeMs ?? 0;
    this.monotonicMs = options.startMonotonicMs ?? 0;
  }

  now(): UnixTimestampMs {
    return unixTimestampMs(this.wallClockMs);
  }

  monotonicNow(): MonotonicTimestampMs {
    return monotonicTimestampMs(this.monotonicMs);
  }

  snapshot(): RuntimeTimeSnapshot {
    return {
      monotonicNow: monotonicTimestampMs(this.monotonicMs),
      wallClockNow: unixTimestampMs(this.wallClockMs),
    };
  }

  advanceBy(durationMs: number): void {
    if (!Number.isFinite(durationMs)) {
      throw new TypeError('durationMs must be finite');
    }

    if (durationMs < 0) {
      throw new RangeError('durationMs must be non-negative');
    }

    this.wallClockMs = safeIntegerAdd(this.wallClockMs, durationMs, 'UnixTimestampMs');
    this.monotonicMs = safeIntegerAdd(this.monotonicMs, durationMs, 'MonotonicTimestampMs');
  }

  setWallClock(timeMs: number): void {
    if (!Number.isFinite(timeMs)) {
      throw new TypeError('timeMs must be finite');
    }

    if (timeMs < 0) {
      throw new RangeError('timeMs must be non-negative');
    }

    this.wallClockMs = timeMs;
  }
}

import type { MonotonicTimestampMs } from '../primitives';
import type { Clock } from './clock.types';
import type { RuntimeTimeSnapshot } from './runtime-time.types';

/**
 * Monotonic clocks are used for:
 * - elapsed duration measurement
 * - retry calculations
 * - token refill timing
 * - timeout handling
 *
 * Unlike wall clocks:
 * - they never move backwards
 * - they are not affected by NTP corrections
 * - they are safe for interval computations
 */
export interface MonotonicClock extends Clock {
  monotonicNow(): MonotonicTimestampMs;

  /**
   * Captures a consistent runtime time snapshot.
   *
   * Intended for:
   * - TTL calculations
   * - distributed coordination
   * - latency-sensitive runtime flows
   * - avoiding mixed-time drift within operations
   */
  snapshot(): RuntimeTimeSnapshot;
}

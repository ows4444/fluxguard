import {
  type ConsumedRateLimitPoints,
  type DurationMilliseconds,
  durationMilliseconds,
  type MonotonicTimestampMs,
  type RateLimitPoints,
  type RemainingRateLimitPoints,
} from '../primitives';
import { calculateConsumedSlots, calculateRemainingSlots, calculateSchedulingDebt } from './gcra.math';

export function calculateEmissionInterval(
  durationMs: DurationMilliseconds,
  points: RateLimitPoints,
): DurationMilliseconds {
  return durationMilliseconds(Math.ceil(durationMs / points));
}

export function calculateBurstTolerance(
  emissionInterval: DurationMilliseconds,
  burstCapacity: RateLimitPoints,
): DurationMilliseconds {
  return durationMilliseconds(Math.max(0, (burstCapacity - 1) * emissionInterval));
}

/**
 * Calculates current scheduling debt.
 *
 * Debt semantics:
 * - 0 => fully replenished
 * - emissionInterval => one consumed slot
 *
 * IMPORTANT:
 * - Uses ceil() intentionally because post-consume TAT
 *   already includes the newly consumed slot.
 */
export function calculateConsumedCapacity(
  theoreticalArrivalTime: MonotonicTimestampMs,
  now: MonotonicTimestampMs,
  emissionInterval: DurationMilliseconds,
): ConsumedRateLimitPoints {
  const debtMs = calculateSchedulingDebt(theoreticalArrivalTime, now);

  return calculateConsumedSlots(debtMs, emissionInterval);
}

/**
 * Calculates immediately available remaining capacity
 * from GCRA scheduling debt.
 *
 * Invariant:
 * - remaining capacity reflects how many additional
 *   requests could be accepted immediately after
 *   the current accepted request.
 *
 * Semantics:
 * - no debt => full remaining capacity
 * - one emission interval of debt => one consumed slot
 * - debt is rounded down intentionally to avoid
 *   premature consumption inflation near boundaries
 */
export function calculateRemainingCapacity(
  theoreticalArrivalTime: MonotonicTimestampMs,
  now: MonotonicTimestampMs,
  emissionInterval: DurationMilliseconds,
  points: RateLimitPoints,
): RemainingRateLimitPoints {
  const consumedSlots = calculateConsumedCapacity(theoreticalArrivalTime, now, emissionInterval);

  return calculateRemainingSlots(points, consumedSlots);
}

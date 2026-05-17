import {
  consumedRateLimitPoints,
  type DurationMilliseconds,
  durationMilliseconds,
  type MonotonicTimestampMs,
  type RateLimitPoints,
  type RemainingRateLimitPoints,
  remainingRateLimitPoints,
} from '../primitives';

export function calculateSchedulingDebt(
  theoreticalArrivalTime: MonotonicTimestampMs,
  now: MonotonicTimestampMs,
): DurationMilliseconds {
  return durationMilliseconds(Math.max(0, theoreticalArrivalTime - now));
}

export function calculateConsumedSlots(debtMs: DurationMilliseconds, emissionInterval: DurationMilliseconds) {
  if (debtMs === 0) {
    return consumedRateLimitPoints(0);
  }

  return consumedRateLimitPoints(Math.ceil(debtMs / emissionInterval));
}

export function calculateRemainingSlots(limit: RateLimitPoints, consumedSlots: number): RemainingRateLimitPoints {
  return remainingRateLimitPoints(Math.max(0, limit - Math.min(limit, consumedSlots)));
}

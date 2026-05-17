import {
  consumedRateLimitPoints,
  durationMilliseconds,
  monotonicTimestampMs,
  rateLimitPoints,
  remainingRateLimitPoints,
  unixTimestampMs,
} from './constructors';
import type { ConsumedRateLimitPoints, RateLimitPoints, RemainingRateLimitPoints } from './rate-limit.types';
import { safeIntegerAdd, safeIntegerMultiply, safeIntegerSubtract } from './safe-integer';
import type { DurationMilliseconds, MonotonicTimestampMs, Seconds, UnixTimestampMs } from './time.types';

export function calculateRemainingRateLimitPoints(
  limit: RateLimitPoints,
  consumed: ConsumedRateLimitPoints,
): RemainingRateLimitPoints {
  return remainingRateLimitPoints(Math.max(0, subtractConsumedFromLimit(limit, consumed)));
}

export function addRateLimitPoints(value: RateLimitPoints, increment: number): RateLimitPoints {
  return rateLimitPoints(value + increment);
}

export function emptyRemainingRateLimitPoints(): RemainingRateLimitPoints {
  return remainingRateLimitPoints(0);
}

export function durationToMilliseconds(duration: Seconds): DurationMilliseconds {
  return durationMilliseconds(safeIntegerMultiply(duration, 1000, 'DurationMilliseconds'));
}

export function durationBetweenUnixTimestamps(left: UnixTimestampMs, right: UnixTimestampMs): DurationMilliseconds {
  return durationMilliseconds(Math.max(0, safeIntegerSubtract(left, right, 'DurationMilliseconds')));
}

export function durationBetweenMonotonicTimestamps(
  left: MonotonicTimestampMs,
  right: MonotonicTimestampMs,
): DurationMilliseconds {
  return durationMilliseconds(Math.max(0, safeIntegerSubtract(left, right, 'DurationMilliseconds')));
}

export function addDurationToUnixTimestamp(
  timestamp: UnixTimestampMs,
  duration: DurationMilliseconds,
): UnixTimestampMs {
  return unixTimestampMs(safeIntegerAdd(timestamp, duration, 'UnixTimestampMs'));
}

export function addDurationToMonotonicTimestamp(
  timestamp: MonotonicTimestampMs,
  duration: DurationMilliseconds,
): MonotonicTimestampMs {
  return monotonicTimestampMs(safeIntegerAdd(timestamp, duration, 'MonotonicTimestampMs'));
}

export function subtractDurationFromMonotonicTimestamp(
  timestamp: MonotonicTimestampMs,
  duration: DurationMilliseconds,
): MonotonicTimestampMs {
  return monotonicTimestampMs(Math.max(0, safeIntegerSubtract(timestamp, duration, 'MonotonicTimestampMs')));
}

export function subtractDuration(left: DurationMilliseconds, right: DurationMilliseconds): DurationMilliseconds {
  return durationMilliseconds(Math.max(0, left - right));
}

export function multiplyDuration(duration: DurationMilliseconds, multiplier: number): DurationMilliseconds {
  return durationMilliseconds(safeIntegerMultiply(duration, multiplier, 'DurationMilliseconds'));
}

export function addDurations(left: DurationMilliseconds, right: DurationMilliseconds): DurationMilliseconds {
  return durationMilliseconds(safeIntegerAdd(left, right, 'DurationMilliseconds'));
}

export function subtractConsumedFromLimit(limit: RateLimitPoints, consumed: ConsumedRateLimitPoints): number {
  return limit - consumed;
}

export function addConsumedRateLimitPoints(value: ConsumedRateLimitPoints, increment: number): ConsumedRateLimitPoints {
  return consumedRateLimitPoints(value + increment);
}

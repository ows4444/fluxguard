import {
  addDurations,
  addDurationToMonotonicTimestamp,
  type ConsumedRateLimitPoints,
  consumedRateLimitPoints,
  durationBetweenMonotonicTimestamps,
  type DurationMilliseconds,
  durationMilliseconds,
  type MonotonicTimestampMs,
  type RateLimitPoints,
  type RemainingRateLimitPoints,
  safeIntegerMultiply,
  subtractDurationFromMonotonicTimestamp,
} from '../../primitives';
import { calculateRemainingCapacity } from '../shared/rate-limit-capacity';

export interface GcraCapacitySnapshot {
  readonly consumed: ConsumedRateLimitPoints;
  readonly debt: DurationMilliseconds;
  readonly remaining: RemainingRateLimitPoints;
}

function assertValidEmissionInterval(emissionInterval: number): void {
  if (emissionInterval <= 0) {
    throw new RangeError('Emission interval must be greater than zero');
  }
}

function selectSchedulingBaseTime(currentTat: MonotonicTimestampMs, now: MonotonicTimestampMs): MonotonicTimestampMs {
  return currentTat > now ? currentTat : now;
}

export function calculateEmissionInterval(
  durationMs: DurationMilliseconds,
  points: RateLimitPoints,
): DurationMilliseconds {
  const emissionInterval = Math.ceil(durationMs / points);

  assertValidEmissionInterval(emissionInterval);

  return durationMilliseconds(emissionInterval);
}

export function calculateBurstTolerance(
  emissionInterval: DurationMilliseconds,
  burstCapacity: RateLimitPoints,
): DurationMilliseconds {
  if (burstCapacity <= 1) {
    return durationMilliseconds(0);
  }

  return durationMilliseconds(safeIntegerMultiply(burstCapacity - 1, emissionInterval, 'DurationMilliseconds'));
}

export function calculateSchedulingDebt(
  theoreticalArrivalTime: MonotonicTimestampMs,
  now: MonotonicTimestampMs,
): DurationMilliseconds {
  return durationBetweenMonotonicTimestamps(theoreticalArrivalTime, now);
}

export function calculateConsumedCapacity(
  debt: DurationMilliseconds,
  emissionInterval: DurationMilliseconds,
): ConsumedRateLimitPoints {
  assertValidEmissionInterval(emissionInterval);

  if (debt === 0) {
    return consumedRateLimitPoints(0);
  }

  return consumedRateLimitPoints(Math.ceil(debt / emissionInterval));
}

export function calculateCapacitySnapshot(
  theoreticalArrivalTime: MonotonicTimestampMs,
  now: MonotonicTimestampMs,
  emissionInterval: DurationMilliseconds,
  limit: RateLimitPoints,
): GcraCapacitySnapshot {
  const debt = calculateSchedulingDebt(theoreticalArrivalTime, now);

  const consumed = calculateConsumedCapacity(debt, emissionInterval);

  return {
    debt,
    consumed,
    remaining: calculateRemainingCapacity(limit, consumed),
  };
}

export function calculateNextTheoreticalArrivalTime(
  currentTat: MonotonicTimestampMs,
  now: MonotonicTimestampMs,
  emissionInterval: DurationMilliseconds,
): MonotonicTimestampMs {
  const baseTat = selectSchedulingBaseTime(currentTat, now);

  return addDurationToMonotonicTimestamp(baseTat, emissionInterval);
}

export function calculateRetryAfter(allowedAt: MonotonicTimestampMs, now: MonotonicTimestampMs): DurationMilliseconds {
  return durationBetweenMonotonicTimestamps(allowedAt, now);
}

export function calculateAllowedAt(
  theoreticalArrivalTime: MonotonicTimestampMs,
  burstTolerance: DurationMilliseconds,
): MonotonicTimestampMs {
  return subtractDurationFromMonotonicTimestamp(theoreticalArrivalTime, burstTolerance);
}

export function isRequestAllowed(now: MonotonicTimestampMs, allowedAt: MonotonicTimestampMs): boolean {
  return now >= allowedAt;
}

export function calculateGcraRetentionDuration(
  theoreticalArrivalTime: MonotonicTimestampMs,
  now: MonotonicTimestampMs,
  burstTolerance: DurationMilliseconds,
  emissionInterval: DurationMilliseconds,
  maxRetentionMs: DurationMilliseconds,
): DurationMilliseconds {
  const debt = calculateSchedulingDebt(theoreticalArrivalTime, now);

  const retention = addDurations(debt, addDurations(burstTolerance, emissionInterval));

  return retention > maxRetentionMs ? maxRetentionMs : retention;
}

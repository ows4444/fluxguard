import {
  addDurationToMonotonicTimestamp,
  calculateRemainingCapacity,
  durationBetweenMonotonicTimestamps,
  type DurationMilliseconds,
  durationMilliseconds,
  emptyRemainingRateLimitPoints,
  type MonotonicTimestampMs,
  type RateLimitPoints,
  type RemainingRateLimitPoints,
  subtractDurationFromMonotonicTimestamp,
} from '../primitives';

export interface GcraEvaluationInput {
  readonly now: MonotonicTimestampMs;

  readonly theoreticalArrivalTime?: MonotonicTimestampMs;

  readonly emissionInterval: DurationMilliseconds;

  readonly burstTolerance: DurationMilliseconds;

  readonly limit: RateLimitPoints;
}

export interface GcraAllowedEvaluation {
  readonly allowed: true;

  readonly remainingPoints: RemainingRateLimitPoints;

  readonly nextTheoreticalArrivalTime: MonotonicTimestampMs;
}

export interface GcraRejectedEvaluation {
  readonly allowed: false;

  readonly retryAfterMs: DurationMilliseconds;

  readonly remainingPoints: RemainingRateLimitPoints;

  readonly nextTheoreticalArrivalTime: MonotonicTimestampMs;
}

export type GcraEvaluation = GcraAllowedEvaluation | GcraRejectedEvaluation;

function resolveCurrentTat(
  theoreticalArrivalTime: MonotonicTimestampMs | undefined,
  now: MonotonicTimestampMs,
): MonotonicTimestampMs {
  return theoreticalArrivalTime ?? now;
}

function calculateNextTat(
  currentTat: MonotonicTimestampMs,
  now: MonotonicTimestampMs,
  emissionInterval: DurationMilliseconds,
): MonotonicTimestampMs {
  const nextBaseTat = now > currentTat ? now : currentTat;

  return addDurationToMonotonicTimestamp(nextBaseTat, emissionInterval);
}

export function evaluateGcra(input: GcraEvaluationInput): GcraEvaluation {
  const currentTat = resolveCurrentTat(input.theoreticalArrivalTime, input.now);

  const allowedAt = subtractDurationFromMonotonicTimestamp(currentTat, input.burstTolerance);

  if (input.now < allowedAt) {
    return {
      allowed: false,
      retryAfterMs: durationBetweenMonotonicTimestamps(allowedAt, input.now),
      remainingPoints: emptyRemainingRateLimitPoints(),
      nextTheoreticalArrivalTime: currentTat,
    };
  }

  const nextTheoreticalArrivalTime = calculateNextTat(currentTat, input.now, input.emissionInterval);

  return {
    allowed: true,
    remainingPoints: calculateRemainingCapacity(
      nextTheoreticalArrivalTime,
      input.now,
      input.emissionInterval,
      input.limit,
    ),
    nextTheoreticalArrivalTime,
  };
}

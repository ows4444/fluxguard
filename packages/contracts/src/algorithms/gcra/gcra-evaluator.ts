import {
  type DurationMilliseconds,
  type MonotonicTimestampMs,
  type RateLimitPoints,
  type RemainingRateLimitPoints,
} from '../../primitives';
import { assertValidGcraParameters } from './gcra.invariants';
import {
  calculateAllowedAt,
  calculateCapacitySnapshot,
  calculateNextTheoreticalArrivalTime,
  calculateRetryAfter,
  isRequestAllowed,
} from './gcra.math';

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

export function evaluateGcra(input: GcraEvaluationInput): GcraEvaluation {
  assertValidGcraParameters(input.emissionInterval, input.burstTolerance, input.limit);
  const currentTat = input.theoreticalArrivalTime ?? input.now;

  const allowedAt = calculateAllowedAt(currentTat, input.burstTolerance);

  if (!isRequestAllowed(input.now, allowedAt)) {
    const snapshot = calculateCapacitySnapshot(currentTat, input.now, input.emissionInterval, input.limit);

    return {
      allowed: false,
      retryAfterMs: calculateRetryAfter(allowedAt, input.now),
      remainingPoints: snapshot.remaining,
      nextTheoreticalArrivalTime: currentTat,
    };
  }

  const nextTheoreticalArrivalTime = calculateNextTheoreticalArrivalTime(currentTat, input.now, input.emissionInterval);

  const snapshot = calculateCapacitySnapshot(
    nextTheoreticalArrivalTime,
    input.now,
    input.emissionInterval,
    input.limit,
  );

  return {
    allowed: true,
    remainingPoints: snapshot.remaining,
    nextTheoreticalArrivalTime,
  };
}

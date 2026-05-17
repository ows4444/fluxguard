import type { DurationMilliseconds, RemainingRateLimitPoints } from '../primitives';
import { durationMilliseconds } from '../primitives';
import { DECISION_OUTCOME, type DecisionOutcome } from './decision-outcome';
import type { ExposureMetadata, RateLimitDecision } from './result.types';
export interface BaseDecisionOptions {
  readonly key: string;

  readonly outcome: DecisionOutcome;

  readonly remainingPoints: RemainingRateLimitPoints | null;

  readonly msBeforeNext: DurationMilliseconds;

  readonly exposure?: ExposureMetadata;
}

function createDecision(options: BaseDecisionOptions): RateLimitDecision {
  return {
    key: options.key,
    outcome: options.outcome,
    remainingPoints: options.remainingPoints,
    msBeforeNext: options.msBeforeNext,
    ...(options.exposure ?? {}),
  };
}

export interface AllowedDecisionOptions {
  readonly key: string;

  readonly remainingPoints: RemainingRateLimitPoints | null;

  readonly exposure?: ExposureMetadata;
}

export function createAllowedDecision(options: AllowedDecisionOptions): RateLimitDecision {
  return createDecision({
    outcome: DECISION_OUTCOME.ALLOWED,
    key: options.key,
    remainingPoints: options.remainingPoints,
    exposure: options.exposure,
    msBeforeNext: durationMilliseconds(0),
  });
}

export interface RejectedDecisionOptions {
  readonly key: string;

  readonly remainingPoints: RemainingRateLimitPoints | null;

  readonly retryAfterMs: DurationMilliseconds;

  readonly exposure?: ExposureMetadata;
}

export function createRejectedDecision(options: RejectedDecisionOptions): RateLimitDecision {
  return createDecision({
    key: options.key,
    msBeforeNext: options.retryAfterMs,

    outcome: DECISION_OUTCOME.REJECTED,
    exposure: options.exposure,
    remainingPoints: options.remainingPoints,
  });
}

export interface BlockedDecisionOptions {
  readonly key: string;

  readonly retryAfterMs: DurationMilliseconds;

  readonly exposure?: ExposureMetadata;
}

export function createBlockedDecision(options: BlockedDecisionOptions): RateLimitDecision {
  return createDecision({
    key: options.key,
    outcome: DECISION_OUTCOME.BLOCKED,
    remainingPoints: null,
    msBeforeNext: options.retryAfterMs,
    exposure: options.exposure,
  });
}

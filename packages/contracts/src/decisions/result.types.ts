import { DECISION_OUTCOME, type DecisionOutcome } from '../decisions/decision-outcome';
import type { DurationMilliseconds, RemainingRateLimitPoints } from '../primitives';
import { PEEK_CONSISTENCY } from '../runtime/runtime-consistency.types';

export interface ConsumeResult {
  readonly key: string;

  readonly outcome: DecisionOutcome;

  readonly remainingPoints: RemainingRateLimitPoints | null;

  readonly msBeforeNext: DurationMilliseconds;
}

export interface ExposureMetadata {
  readonly message?: string;

  readonly errorCode?: string;
}

interface BaseDecision extends ExposureMetadata {
  readonly key: string;
  readonly msBeforeNext: DurationMilliseconds;
}

interface AllowedDecision extends BaseDecision {
  readonly outcome: typeof DECISION_OUTCOME.ALLOWED;
  readonly remainingPoints: RemainingRateLimitPoints;
}

interface BlockedDecision extends BaseDecision {
  readonly outcome: typeof DECISION_OUTCOME.BLOCKED;
  readonly remainingPoints: null;
}

interface RejectedDecision extends BaseDecision {
  readonly outcome: typeof DECISION_OUTCOME.REJECTED;
  readonly remainingPoints: RemainingRateLimitPoints | null;
}

export type RateLimitDecision = AllowedDecision | RejectedDecision | BlockedDecision;

export type AdvisoryPeekResult = RateLimitDecision & {
  readonly consistency: typeof PEEK_CONSISTENCY.ADVISORY;
};

export type ConsistentPeekResult = RateLimitDecision & {
  readonly consistency: typeof PEEK_CONSISTENCY.CONSISTENT;
};

export type PeekResult = AdvisoryPeekResult | ConsistentPeekResult;

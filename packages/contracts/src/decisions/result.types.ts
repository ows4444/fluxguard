import type { DecisionOutcome } from '../decisions/decision-outcome';
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

export interface RateLimitDecision extends ConsumeResult, ExposureMetadata {}

export interface AdvisoryPeekResult extends RateLimitDecision {
  readonly consistency: typeof PEEK_CONSISTENCY.ADVISORY;
}

export interface ConsistentPeekResult extends RateLimitDecision {
  readonly consistency: typeof PEEK_CONSISTENCY.CONSISTENT;
}

export type PeekResult = AdvisoryPeekResult | ConsistentPeekResult;

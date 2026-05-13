import type { DecisionOutcome } from '../decisions/decision-outcome';

export interface ConsumeResult {
  readonly key: string;

  readonly outcome: DecisionOutcome;

  readonly remainingPoints: number | null;

  readonly msBeforeNext: number;
}

export interface ExposureMetadata {
  readonly message?: string | ((retryAfter: number) => string);

  readonly errorCode?: string;
}

export interface RateLimitDecision extends ConsumeResult, ExposureMetadata {}

export interface AdvisoryPeekResult extends RateLimitDecision {
  readonly consistency: 'advisory';
}

export interface ConsistentPeekResult extends RateLimitDecision {
  readonly consistency: 'consistent';
}

export type PeekResult = AdvisoryPeekResult | ConsistentPeekResult;

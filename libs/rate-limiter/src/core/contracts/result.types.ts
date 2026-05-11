import type { DecisionOutcome } from './decision-outcome';

export interface ConsumeResult {
  readonly key: string;

  readonly outcome: DecisionOutcome;

  readonly remainingPoints: number | null;

  readonly msBeforeNext: number;
}

export interface RuntimeExposure {
  readonly message?: string | ((retryAfter: number) => string);

  readonly errorCode?: string;
}

export interface RuntimeDecision extends ConsumeResult, RuntimeExposure {}

export interface AdvisoryPeekResult extends RuntimeDecision {
  readonly consistency: 'advisory';
}

export interface ConsistentPeekResult extends RuntimeDecision {
  readonly consistency: 'consistent';
}

export type PeekResult = AdvisoryPeekResult | ConsistentPeekResult;

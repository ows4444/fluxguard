import type { RateLimitKind } from '../config/rate-limit.types';
import type { DecisionOutcome } from '../decisions/decision-outcome';
import type { DurationMilliseconds, RemainingRateLimitPoints } from '../primitives';

export interface BaseDecisionEvent {
  readonly key: string;
  readonly kind: RateLimitKind;
  readonly limiterName: string;
  readonly outcome: DecisionOutcome;
  readonly remainingPoints: RemainingRateLimitPoints | null;
}

export interface RateLimitDecisionEvent extends BaseDecisionEvent {
  readonly msBeforeNext: DurationMilliseconds;
}

import type { RateLimitKind } from '../config/rate-limit.types';
import type { DecisionOutcome } from '../decisions/decision-outcome';

export interface RateLimitDecisionEvent {
  key: string;
  kind: RateLimitKind;
  limiterName: string;
  msBeforeNext: number;
  outcome: DecisionOutcome;
  remainingPoints: number | null;
}

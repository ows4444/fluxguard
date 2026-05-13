import type { RateLimitKind } from '../config/rate-limit.types';
import type { DecisionOutcome } from '../decisions/decision-outcome';

export interface RateLimitDecisionEvent {
  limiterName: string;
  outcome: DecisionOutcome;
  kind: RateLimitKind;
  remainingPoints: number | null;
  msBeforeNext: number;
  key: string;
}

export const DECISION_OUTCOME = {
  ALLOWED: 'ALLOWED',
  REJECTED: 'REJECTED',
  BLOCKED: 'BLOCKED',
} as const;

export type DecisionOutcome = (typeof DECISION_OUTCOME)[keyof typeof DECISION_OUTCOME];

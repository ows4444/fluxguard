export const DecisionOutcome = {
  ALLOWED: 'ALLOWED',
  REJECTED: 'REJECTED',
  BLOCKED: 'BLOCKED',
  DEGRADED_ALLOWED: 'DEGRADED_ALLOWED',
  DEGRADED_REJECTED: 'DEGRADED_REJECTED',
} as const;

export type DecisionOutcome = (typeof DecisionOutcome)[keyof typeof DecisionOutcome];

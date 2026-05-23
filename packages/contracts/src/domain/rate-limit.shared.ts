export interface RateLimitEvaluationSnapshot {
  readonly ruleId: string;

  readonly limit: number;

  readonly remaining: number;
  readonly resetAtMs: number;
}

export type BypassReason = 'exempt-user' | 'exempt-cidr' | 'bypass-token';

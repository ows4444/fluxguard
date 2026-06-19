import type { AlgorithmState } from './algorithm-state.contract';

export interface RateLimitEvaluationSnapshot {
  readonly ruleId: string;

  readonly limit: number;

  readonly remaining: number;
  readonly resetAtMs: number;

  readonly algorithmState?: AlgorithmState;
}

export type BypassReason = 'exempt-user' | 'exempt-cidr' | 'bypass-token';

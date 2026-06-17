import type { EvaluationContext } from '../runtime/evaluation-context';

export interface AlgorithmResult {
  readonly allowed: boolean;

  readonly burstConsumed?: boolean;
  readonly burstRemaining?: number;

  readonly remaining: number;

  readonly resetAtMs: number;

  readonly nextAllowedAtMs?: number;
}

export interface RateLimitAlgorithm {
  evaluate(context: EvaluationContext): Promise<AlgorithmResult>;
}

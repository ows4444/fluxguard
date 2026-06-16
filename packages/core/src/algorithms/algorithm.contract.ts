import type { EvaluationContext } from '../runtime/evaluation-context';

export interface AlgorithmResult {
  readonly allowed: boolean;

  readonly remaining: number;

  readonly resetAtMs: number;

  readonly nextAllowedAtMs?: number;
}

export interface RateLimitAlgorithm {
  evaluate(context: EvaluationContext): Promise<AlgorithmResult>;
}

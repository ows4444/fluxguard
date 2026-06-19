import type { AlgorithmCapabilities, AlgorithmState, RateLimitAlgorithmId } from '@fluxguard/contracts';

import type { EvaluationContext } from '../runtime/evaluation-context';
import type { ShadowEvaluationContext } from '../runtime/shadow-evaluation-context';

export interface AlgorithmResult {
  readonly allowed: boolean;

  readonly fromIdempotencyCache?: boolean;

  readonly fromReplica?: boolean;

  readonly burstConsumed?: boolean;
  readonly burstRemaining?: number;

  readonly remaining: number;

  readonly resetAtMs: number;

  readonly nextAllowedAtMs?: number;

  readonly algorithmState?: AlgorithmState;
}

export interface RateLimitAlgorithm {
  readonly supportsShadowEvaluation: boolean;
  evaluate(context: EvaluationContext): Promise<AlgorithmResult>;

  evaluateShadow(context: ShadowEvaluationContext): Promise<void>;
}

export interface RegisteredAlgorithm {
  readonly id: RateLimitAlgorithmId;
  readonly capabilities: AlgorithmCapabilities;
  readonly implementation: RateLimitAlgorithm;
}

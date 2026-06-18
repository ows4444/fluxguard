import type { EvaluationContext } from '../runtime/evaluation-context';
import type { ShadowEvaluationContext } from '../runtime/shadow-evaluation-context';
import type { AlgorithmResult } from './algorithm.contract';

export abstract class BaseRateLimitAlgorithm {
  readonly supportsShadowEvaluation: boolean = false;
  abstract evaluate(context: EvaluationContext): Promise<AlgorithmResult>;

  async evaluateShadow(_context: ShadowEvaluationContext): Promise<void> {
    // intentionally noop
  }
}

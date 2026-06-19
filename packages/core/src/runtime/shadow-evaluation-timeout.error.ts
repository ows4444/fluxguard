import { FluxGuardError, type RateLimitAlgorithmId } from '@fluxguard/contracts';

export class ShadowEvaluationTimeoutError extends FluxGuardError {
  constructor(
    public readonly ruleId: string,
    public readonly algorithm: RateLimitAlgorithmId,
    public readonly timeoutMs: number,
  ) {
    super(`Shadow evaluation timed out after ${timeoutMs}ms (${ruleId})`);
  }
}

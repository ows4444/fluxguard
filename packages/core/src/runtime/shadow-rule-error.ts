import { FluxGuardError, type RateLimitAlgorithmId } from '@fluxguard/contracts';

export class ShadowRuleEvaluationError extends FluxGuardError {
  constructor(
    public readonly ruleId: string,
    public readonly algorithm: RateLimitAlgorithmId,
    public readonly requestRoute: string,
    public readonly requestMethod: string,
    cause: unknown,
  ) {
    super(`Shadow rule evaluation failed (${ruleId})`, {
      cause,
    });
  }
}

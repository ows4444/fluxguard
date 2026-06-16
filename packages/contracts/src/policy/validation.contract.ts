import type { RateLimitPolicy } from './policy.contract';

export const POLICY_VALIDATION_LIMITS = Object.freeze({
  maxRules: 256,
  maxRoutePatternsPerRule: 32,
  maxMethodsPerRule: 8,
  maxTagsPerRule: 32,
  maxTagLength: 64,
  maxExemptCidrs: 256,
  maxExemptUsers: 10_000,
  minPriority: 0,
  maxPriority: 1000,
} as const);

export interface PolicyValidationError {
  readonly message: string;
  readonly path: ReadonlyArray<string | number>;
}

export interface PolicyValidationResult {
  readonly errors: ReadonlyArray<PolicyValidationError>;
  readonly valid: boolean;
}

export interface IPolicyValidator {
  validate(policy: RateLimitPolicy): PolicyValidationResult;
}

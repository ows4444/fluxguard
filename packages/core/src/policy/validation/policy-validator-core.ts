import { POLICY_VALIDATION_LIMITS, type PolicyValidationError, type RateLimitPolicy } from '@fluxguard/contracts';

export function validatePolicyLevelRules(policy: RateLimitPolicy, errors: PolicyValidationError[]): void {
  if (policy.rules.length > POLICY_VALIDATION_LIMITS.maxRules) {
    errors.push({
      path: ['rules'],
      message: 'max rules exceeded',
    });

    return;
  }

  const hasEnforcingRule = policy.rules.some((rule) => rule.execution.action !== 'shadow');

  if (!hasEnforcingRule) {
    errors.push({
      path: ['rules'],
      message: 'at least one non-shadow rule is required',
    });
  }
}

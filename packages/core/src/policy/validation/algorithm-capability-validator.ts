import type { AlgorithmCapabilities, PolicyValidationError, RateLimitRule } from '@fluxguard/contracts';

import { checkAlgorithmCapabilities } from '../shared/algorithm-capability-check';

export function validateAlgorithmConfiguration(
  rule: RateLimitRule,
  capabilities: AlgorithmCapabilities,
  errors: PolicyValidationError[],
): void {
  const violations = checkAlgorithmCapabilities(rule, capabilities);

  for (const violation of violations) {
    errors.push({
      path: ['rules', rule.id, 'quota'],
      message: violation.message,
    });
  }
}

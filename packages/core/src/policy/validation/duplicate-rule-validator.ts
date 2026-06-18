import type { PolicyValidationError, RateLimitPolicy } from '@fluxguard/contracts';

export function validateDuplicateRuleIds(policy: RateLimitPolicy, errors: PolicyValidationError[]): void {
  const ids = new Set<string>();

  for (const rule of policy.rules) {
    if (ids.has(rule.id)) {
      errors.push({
        path: ['rules', rule.id],
        message: 'duplicate rule id',
      });
    }

    ids.add(rule.id);
  }
}

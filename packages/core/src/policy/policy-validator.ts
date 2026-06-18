import {
  type IPolicyValidator,
  type PolicyValidationError,
  type PolicyValidationResult,
  type RateLimitPolicy,
} from '@fluxguard/contracts';

import { validateBypassPolicy } from './validation/bypass-validator';
import { validateDuplicateRuleIds } from './validation/duplicate-rule-validator';
import { validatePolicyLevelRules } from './validation/policy-validator-core';
import { validateRule } from './validation/rule-validator';

export class PolicyValidator implements IPolicyValidator {
  validate(policy: RateLimitPolicy): PolicyValidationResult {
    const errors: PolicyValidationError[] = [];

    validatePolicyLevelRules(policy, errors);
    validateBypassPolicy(policy, { errors });
    validateDuplicateRuleIds(policy, errors);

    for (const rule of policy.rules) {
      validateRule(rule, errors);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

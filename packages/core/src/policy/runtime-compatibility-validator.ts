import {
  type RateLimitPolicy,
  type RuntimeCompatibilityError,
  type RuntimeCompatibilityValidator as IRuntimeCompatibilityValidator,
  SupportedAlgorithms,
  supportsWindowPolicy,
} from '@fluxguard/contracts';

import type { AlgorithmRegistry } from '../algorithms/algorithm.registry';

export class RuntimeCompatibilityValidator implements IRuntimeCompatibilityValidator {
  constructor(private readonly registry: AlgorithmRegistry) {}

  validate(policy: RateLimitPolicy): ReadonlyArray<RuntimeCompatibilityError> {
    const errors: RuntimeCompatibilityError[] = [];

    for (const rule of policy.rules) {
      if (!SupportedAlgorithms.includes(rule.execution.algorithm)) {
        errors.push({
          ruleId: rule.id,
          message: `algorithm not yet implemented: ${rule.execution.algorithm}`,
        });
        continue;
      }

      if (!this.registry.has(rule.execution.algorithm)) {
        errors.push({
          ruleId: rule.id,
          message: `algorithm not available: ${rule.execution.algorithm}`,
        });
      }

      if (!supportsWindowPolicy(rule.execution.algorithm, rule.quota.window)) {
        errors.push({
          ruleId: rule.id,
          message: `algorithm "${rule.execution.algorithm}" does not support window type "${rule.quota.window.type}"`,
        });
      }
    }

    return errors;
  }
}

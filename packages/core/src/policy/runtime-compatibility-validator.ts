import {
  AlgorithmCapabilitiesRegistry,
  type Clock,
  type IRateLimitStore,
  isCalendarMonthWindow,
  type RateLimitPolicy,
  type RuntimeCompatibilityError,
  type RuntimeCompatibilityValidator as IRuntimeCompatibilityValidator,
} from '@fluxguard/contracts';
import { supportsWindowType } from '@fluxguard/contracts';

import type { AlgorithmRegistry } from '../algorithms/algorithm.registry';

export class RuntimeCompatibilityValidator implements IRuntimeCompatibilityValidator {
  constructor(
    private readonly registry: AlgorithmRegistry,
    private readonly store: IRateLimitStore,
    private readonly clock: Clock,
  ) {}

  validate(policy: RateLimitPolicy): ReadonlyArray<RuntimeCompatibilityError> {
    const errors: RuntimeCompatibilityError[] = [];

    const supportedModes = this.store.capabilities().supportedModes;

    for (const rule of policy.rules) {
      if (isCalendarMonthWindow(rule.quota.window) && !this.clock.capabilities().supportsCalendarMonthWindow) {
        errors.push({
          ruleId: rule.id,
          message: 'runtime clock does not support calendar-month-window',
        });

        continue;
      }

      const isKnownAlgorithm = Object.prototype.hasOwnProperty.call(
        AlgorithmCapabilitiesRegistry,
        rule.execution.algorithm,
      );
      const capabilities = isKnownAlgorithm ? AlgorithmCapabilitiesRegistry[rule.execution.algorithm] : undefined;

      if (!capabilities) {
        errors.push({
          ruleId: rule.id,
          message: `capabilities not registered for algorithm "${rule.execution.algorithm}"`,
        });

        continue;
      }

      if (!supportedModes.includes(capabilities.storeMode)) {
        errors.push({
          ruleId: rule.id,
          message: `store does not support mode "${capabilities.storeMode}"`,
        });

        continue;
      }

      if (!this.registry.has(rule.execution.algorithm)) {
        errors.push({
          ruleId: rule.id,
          message: `algorithm not available: ${rule.execution.algorithm}`,
        });
        continue;
      }

      if (!supportsWindowType(rule.execution.algorithm, rule.quota.window.type)) {
        errors.push({
          ruleId: rule.id,
          message: `algorithm "${rule.execution.algorithm}" does not support window type "${rule.quota.window.type}"`,
        });
      }
    }

    return errors;
  }
}

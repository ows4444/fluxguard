import {
  type Clock,
  type IRateLimitStore,
  isCalendarMonthWindow,
  type RateLimitPolicy,
  type RuntimeCompatibilityError,
  type RuntimeCompatibilityValidator as IRuntimeCompatibilityValidator,
} from '@fluxguard/contracts';

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

      const registration = this.registry.has(rule.execution.algorithm)
        ? this.registry.getRegistration(rule.execution.algorithm)
        : undefined;

      if (!registration) {
        errors.push({
          ruleId: rule.id,
          message: `algorithm "${rule.execution.algorithm}" is not registered in AlgorithmRegistry`,
        });
        continue;
      }

      const capabilities = registration.capabilities;

      if (!capabilities.supportsBurstLimit && rule.quota.burstLimit !== undefined) {
        errors.push({
          ruleId: rule.id,
          message: 'burst configuration unsupported by algorithm',
        });
      }

      if (!capabilities.supportsRefillRate && rule.quota.refillRatePerSec !== undefined) {
        errors.push({
          ruleId: rule.id,
          message: 'refillRatePerSec unsupported by algorithm',
        });
      }

      if (!supportedModes.includes(capabilities.storeMode)) {
        errors.push({
          ruleId: rule.id,
          message: `store does not support mode "${capabilities.storeMode}"`,
        });

        continue;
      }

      if (!capabilities.supportedWindows.includes(rule.quota.window.type)) {
        errors.push({
          ruleId: rule.id,
          message: `algorithm "${rule.execution.algorithm}" does not support window type "${rule.quota.window.type}"`,
        });
      }
    }

    return errors;
  }
}

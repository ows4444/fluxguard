import type { AlgorithmCapabilities, RateLimitRule } from '@fluxguard/contracts';

export interface AlgorithmCapabilityViolation {
  readonly message: string;
}

export function checkAlgorithmCapabilities(
  rule: RateLimitRule,
  capabilities: AlgorithmCapabilities,
): readonly AlgorithmCapabilityViolation[] {
  const violations: AlgorithmCapabilityViolation[] = [];

  if (!capabilities.supportsBurstLimit && rule.quota.burstLimit !== undefined) {
    violations.push({
      message: 'burst configuration unsupported by algorithm',
    });
  }

  if (!capabilities.supportsRefillRate && rule.quota.refillRatePerSec !== undefined) {
    violations.push({
      message: 'refillRatePerSec unsupported by algorithm',
    });
  }

  if (!capabilities.supportedWindows.includes(rule.quota.window.type)) {
    violations.push({
      message: `algorithm "${rule.execution.algorithm}" does not support window type "${rule.quota.window.type}"`,
    });
  }

  return violations;
}

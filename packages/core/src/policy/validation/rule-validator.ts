import {
  // type AlgorithmCapabilities,
  POLICY_VALIDATION_LIMITS,
  type PolicyValidationError,
  type RateLimitRule,
} from '@fluxguard/contracts';
import { AlgorithmCapabilitiesRegistry } from '@fluxguard/contracts';

import { validateRoutePatterns } from './route-pattern-validator';
import { validateWindow } from './window-validator';

export function validateRule(rule: RateLimitRule, errors: PolicyValidationError[]): void {
  const isKnownAlgorithm = Object.prototype.hasOwnProperty.call(
    AlgorithmCapabilitiesRegistry,
    rule.execution.algorithm,
  );
  const capabilities = isKnownAlgorithm ? AlgorithmCapabilitiesRegistry[rule.execution.algorithm] : undefined;

  if (!capabilities) {
    errors.push({
      path: ['rules', rule.id, 'execution', 'algorithm'],
      message: `unknown algorithm: "${rule.execution.algorithm}"`,
    });
  }
  //  else {
  //   validateAlgorithmCompatibility(rule, capabilities, errors);
  // }

  validateExecution(rule, errors);
  validateQuota(rule, errors);
  validateMatchers(rule, errors);
  validateMetadata(rule, errors);
  validateWindow(rule, errors);
}

// function validateAlgorithmCompatibility(
//   rule: RateLimitRule,
//   capabilities: AlgorithmCapabilities,
//   errors: PolicyValidationError[],
// ): void {
//   if (!capabilities.supportsBurstLimit && rule.quota.burstLimit !== undefined) {
//     errors.push({
//       path: ['rules', rule.id, 'quota'],
//       message: 'burst configuration unsupported by algorithm',
//     });
//   }

//   if (!capabilities.supportsRefillRate && rule.quota.refillRatePerSec !== undefined) {
//     errors.push({
//       path: ['rules', rule.id, 'quota'],
//       message: 'refillRatePerSec unsupported by algorithm',
//     });
//   }
// }

function validateExecution(rule: RateLimitRule, errors: PolicyValidationError[]): void {
  const shedProbability = rule.execution.shedProbability;

  if (
    rule.execution.priority < POLICY_VALIDATION_LIMITS.minPriority ||
    rule.execution.priority > POLICY_VALIDATION_LIMITS.maxPriority
  ) {
    errors.push({
      path: ['rules', rule.id, 'execution', 'priority'],
      message: 'invalid priority',
    });
  }

  if (rule.execution.action !== 'throttle' && shedProbability !== undefined) {
    errors.push({
      path: ['rules', rule.id, 'execution', 'shedProbability'],
      message: 'shedProbability is only valid for throttle rules',
    });

    return;
  }

  if (rule.execution.action === 'throttle' && shedProbability !== undefined) {
    if (
      typeof shedProbability !== 'number' ||
      !Number.isFinite(shedProbability) ||
      shedProbability < 0 ||
      shedProbability > 1
    ) {
      errors.push({
        path: ['rules', rule.id, 'execution', 'shedProbability'],
        message: 'shedProbability must be a finite number in [0, 1]',
      });
    }
  }
}

function validateQuota(rule: RateLimitRule, errors: PolicyValidationError[]): void {
  if (rule.quota.limit <= 0) {
    errors.push({
      path: ['rules', rule.id, 'quota', 'limit'],
      message: 'limit must be > 0',
    });
  }

  if (rule.quota.burstLimit !== undefined && rule.quota.burstLimit <= 0) {
    errors.push({
      path: ['rules', rule.id, 'quota', 'burstLimit'],
      message: 'burstLimit must be > 0',
    });
  }

  if (rule.quota.burstLimit !== undefined && rule.quota.burstLimit < rule.quota.limit) {
    errors.push({
      path: ['rules', rule.id, 'quota', 'burstLimit'],
      message: 'burstLimit must be >= limit',
    });
  }

  if (
    rule.quota.refillRatePerSec !== undefined &&
    (!Number.isFinite(rule.quota.refillRatePerSec) || rule.quota.refillRatePerSec <= 0)
  ) {
    errors.push({
      path: ['rules', rule.id, 'quota', 'refillRatePerSec'],
      message: 'refillRatePerSec must be a finite number > 0',
    });
  }
}

function validateMatchers(rule: RateLimitRule, errors: PolicyValidationError[]): void {
  if ((rule.match.methods?.length ?? 0) > POLICY_VALIDATION_LIMITS.maxMethodsPerRule) {
    errors.push({
      path: ['rules', rule.id, 'match', 'methods'],
      message: 'max methods exceeded',
    });
  }

  if ((rule.match.routePatterns?.length ?? 0) > POLICY_VALIDATION_LIMITS.maxRoutePatternsPerRule) {
    errors.push({
      path: ['rules', rule.id, 'match', 'routePatterns'],
      message: 'max route patterns exceeded',
    });
  } else {
    validateRoutePatterns(rule, errors);
  }
}

function validateMetadata(rule: RateLimitRule, errors: PolicyValidationError[]): void {
  if ((rule.meta?.tags?.length ?? 0) > POLICY_VALIDATION_LIMITS.maxTagsPerRule) {
    errors.push({
      path: ['rules', rule.id, 'meta', 'tags'],
      message: 'max tags exceeded',
    });

    return;
  }

  const seen = new Set<string>();

  for (const tag of rule.meta?.tags ?? []) {
    if (tag.length > POLICY_VALIDATION_LIMITS.maxTagLength) {
      errors.push({
        path: ['rules', rule.id, 'meta', 'tags'],
        message: 'tag length exceeded',
      });
    }

    if (seen.has(tag)) {
      errors.push({
        path: ['rules', rule.id, 'meta', 'tags'],
        message: `duplicate tag: "${tag}"`,
      });
      continue;
    }

    seen.add(tag);
  }
}

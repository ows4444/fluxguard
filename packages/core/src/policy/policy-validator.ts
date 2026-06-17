import {
  type IPolicyValidator,
  isFixedWindow,
  parseCidr,
  parseRoutePattern,
  POLICY_VALIDATION_LIMITS,
  type PolicyValidationError,
  type PolicyValidationResult,
  type RateLimitPolicy,
} from '@fluxguard/contracts';

export class PolicyValidator implements IPolicyValidator {
  validate(policy: RateLimitPolicy): PolicyValidationResult {
    const errors: PolicyValidationError[] = [];

    if (policy.rules.length > POLICY_VALIDATION_LIMITS.maxRules) {
      errors.push({
        path: ['rules'],
        message: 'max rules exceeded',
      });
    } else {
      const hasEnforcingRule = policy.rules.some((rule) => rule.execution.action !== 'shadow');

      if (!hasEnforcingRule) {
        errors.push({
          path: ['rules'],
          message: 'at least one non-shadow rule is required',
        });
      }
    }

    const ids = new Set<string>();

    if ((policy.bypass?.exemptCidrs?.length ?? 0) > POLICY_VALIDATION_LIMITS.maxExemptCidrs) {
      errors.push({
        path: ['bypass', 'exemptCidrs'],
        message: 'max exempt cidrs exceeded',
      });
    } else {
      for (const cidr of policy.bypass?.exemptCidrs ?? []) {
        const result = parseCidr(cidr);
        if (!result.ok) {
          errors.push({
            path: ['bypass', 'exemptCidrs'],
            message: result.error,
          });
        }
      }
    }

    if ((policy.bypass?.exemptUserIds?.length ?? 0) > POLICY_VALIDATION_LIMITS.maxExemptUsers) {
      errors.push({
        path: ['bypass', 'exemptUserIds'],
        message: 'max exempt users exceeded',
      });
    }

    for (const rule of policy.rules) {
      if (
        rule.execution.algorithm === 'fixed-window' &&
        (rule.quota.burstLimit !== undefined || rule.quota.refillRatePerSec !== undefined)
      ) {
        errors.push({
          path: ['rules', rule.id, 'quota'],
          message: 'burst configuration unsupported by algorithm',
        });
      }

      const sp = rule.execution.shedProbability;

      if (rule.execution.action !== 'throttle' && sp !== undefined) {
        errors.push({
          path: ['rules', rule.id, 'execution', 'shedProbability'],
          message: 'shedProbability is only valid for throttle rules',
        });
      } else if (rule.execution.action === 'throttle' && sp !== undefined) {
        if (typeof sp !== 'number' || !Number.isFinite(sp) || sp < 0 || sp > 1) {
          errors.push({
            path: ['rules', rule.id, 'execution', 'shedProbability'],
            message: 'shedProbability must be a finite number in [0, 1]',
          });
        }
      }

      if (isFixedWindow(rule.quota.window)) {
        if (rule.quota.window.size <= 0) {
          errors.push({
            path: ['rules', rule.id, 'quota', 'window', 'size'],
            message: 'window size must be > 0',
          });
        }
      }

      if (
        rule.execution.priority < POLICY_VALIDATION_LIMITS.minPriority ||
        rule.execution.priority > POLICY_VALIDATION_LIMITS.maxPriority
      ) {
        errors.push({
          path: ['rules', rule.id, 'execution', 'priority'],
          message: 'invalid priority',
        });
      }

      if (ids.has(rule.id)) {
        errors.push({
          path: ['rules', rule.id],
          message: 'duplicate rule id',
        });
      }

      ids.add(rule.id);

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
      } else if (rule.match.routePatterns && rule.match.routePatterns.length > 0) {
        const seen = new Set<string>();
        for (const pattern of rule.match.routePatterns) {
          if (seen.has(pattern)) {
            errors.push({
              path: ['rules', rule.id, 'match', 'routePatterns'],
              message: `duplicate route pattern: "${pattern}"`,
            });
          }
          seen.add(pattern);
        }
      }

      if ((rule.meta?.tags?.length ?? 0) > POLICY_VALIDATION_LIMITS.maxTagsPerRule) {
        errors.push({
          path: ['rules', rule.id, 'meta', 'tags'],
          message: 'max tags exceeded',
        });
      } else {
        for (const tag of rule.meta?.tags ?? []) {
          if (tag.length > POLICY_VALIDATION_LIMITS.maxTagLength) {
            errors.push({
              path: ['rules', rule.id, 'meta', 'tags'],
              message: 'tag length exceeded',
            });
          }
        }
      }

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

      if (
        rule.quota.burstLimit !== undefined &&
        rule.quota.limit !== undefined &&
        rule.quota.burstLimit < rule.quota.limit
      ) {
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

      for (const pattern of rule.match.routePatterns ?? []) {
        const result = parseRoutePattern(pattern);

        if (!result.ok) {
          errors.push({
            path: ['rules', rule.id, 'match', 'routePatterns'],
            message: result.error,
          });
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

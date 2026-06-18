import { parseCidr, POLICY_VALIDATION_LIMITS, type RateLimitPolicy } from '@fluxguard/contracts';

import type { ValidationContext } from './validation-context';

export function validateBypassPolicy(policy: RateLimitPolicy, context: ValidationContext): void {
  if ((policy.bypass?.exemptCidrs?.length ?? 0) > POLICY_VALIDATION_LIMITS.maxExemptCidrs) {
    context.errors.push({
      path: ['bypass', 'exemptCidrs'],
      message: 'max exempt cidrs exceeded',
    });
  } else {
    for (const cidr of policy.bypass?.exemptCidrs ?? []) {
      const result = parseCidr(cidr);

      if (!result.ok) {
        context.errors.push({
          path: ['bypass', 'exemptCidrs'],
          message: result.error,
        });
      }
    }
  }

  if ((policy.bypass?.exemptUserIds?.length ?? 0) > POLICY_VALIDATION_LIMITS.maxExemptUsers) {
    context.errors.push({
      path: ['bypass', 'exemptUserIds'],
      message: 'max exempt users exceeded',
    });
  }
}

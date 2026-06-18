import { type RateLimitPolicy } from '@fluxguard/contracts';

import type { RuntimeCompatibilityValidator } from '../policy/runtime-compatibility-validator';

export function validateRuntimeCompatibilityOrThrow(
  validator: RuntimeCompatibilityValidator,
  policy: RateLimitPolicy,
): void {
  const errors = validator.validate(policy);

  if (errors.length > 0) {
    throw new Error(errors.map((e) => e.message).join(', '));
  }
}

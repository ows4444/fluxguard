import { type RateLimitPolicy } from '@fluxguard/contracts';

import type { RuntimeCompatibilityValidator } from '../policy/runtime-compatibility-validator';
import { RuntimeCompatibilityValidationError } from './runtime-compatibility.error';

export function validateRuntimeCompatibilityOrThrow(
  validator: RuntimeCompatibilityValidator,
  policy: RateLimitPolicy,
): void {
  const errors = validator.validate(policy);

  if (errors.length > 0) {
    throw new RuntimeCompatibilityValidationError(errors);
  }
}

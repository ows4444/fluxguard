import { type RateLimitPolicy, type RuntimeCompatibilityValidator } from '@fluxguard/contracts';

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

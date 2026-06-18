import type { PolicyValidationError } from '@fluxguard/contracts';

export interface ValidationContext {
  readonly errors: PolicyValidationError[];
}

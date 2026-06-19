import { FluxGuardError, type RuntimeCompatibilityError } from '@fluxguard/contracts';

export class RuntimeCompatibilityValidationError extends FluxGuardError {
  constructor(public readonly errors: ReadonlyArray<RuntimeCompatibilityError>) {
    super('Runtime compatibility validation failed');
  }
}

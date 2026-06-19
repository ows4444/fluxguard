import { FluxGuardError } from '../errors/fluxguard.error';
import type { StoreFailure } from './store.failure';

export class StoreFailureError extends FluxGuardError {
  constructor(public readonly failure: StoreFailure) {
    super(`${failure.type} (${failure.operation ?? 'unknown'})`, { cause: failure });
  }
}

export class InvalidResetCommandError extends FluxGuardError {
  constructor(message: string) {
    super(message);
  }
}

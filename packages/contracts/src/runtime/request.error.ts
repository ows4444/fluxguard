import { FluxGuardError } from '../errors/fluxguard.error';
import type { RequestValidationError } from './request.validation';
import type { RateLimitRequest } from './runtime.contract';

export class InvalidRateLimitRequestError extends FluxGuardError {
  constructor(
    public readonly request: RateLimitRequest,
    public readonly validationErrors: ReadonlyArray<RequestValidationError> = [],
  ) {
    super('Invalid rate limit request');
  }
}

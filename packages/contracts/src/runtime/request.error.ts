import type { RequestValidationError } from './request.validation';
import type { RateLimitRequest } from './runtime.contract';

export class InvalidRateLimitRequestError extends Error {
  constructor(
    public readonly request: RateLimitRequest,
    public readonly validationErrors: ReadonlyArray<RequestValidationError> = [],
  ) {
    super('Invalid rate limit request');

    this.name = 'InvalidRateLimitRequestError';
  }
}

export abstract class RateLimiterError extends Error {
  abstract readonly code: string;

  readonly retryable: boolean;

  protected constructor(
    message: string,
    options?: ErrorOptions & {
      retryable?: boolean;
    },
  ) {
    super(message, options);

    Object.setPrototypeOf(this, new.target.prototype);
    this.name = new.target.name;

    this.retryable = options?.retryable ?? false;
  }
}

export class RateLimiterConfigurationError extends RateLimiterError {
  override readonly code: string = 'RATE_LIMITER_CONFIGURATION_ERROR';

  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
  }
}

export class RateLimiterConsistencyError extends RateLimiterError {
  override readonly code: string = 'RATE_LIMITER_CONSISTENCY_ERROR';

  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
  }
}

export class RateLimiterInfrastructureError extends RateLimiterError {
  override readonly code: string = 'RATE_LIMITER_INFRASTRUCTURE_ERROR';

  constructor(message: string, options: ErrorOptions & { retryable: boolean }) {
    super(message, options);
  }
}

export class RateLimiterUnsupportedOperationError extends RateLimiterError {
  override readonly code: string = 'RATE_LIMITER_UNSUPPORTED_OPERATION';

  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
  }
}

export class RateLimiterInvariantError extends RateLimiterError {
  override readonly code: string = 'RATE_LIMITER_INVARIANT_ERROR';

  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
  }
}

export class RateLimiterConfigurationError extends Error {
  readonly name = 'RateLimiterConfigurationError';
}

export class RateLimiterInfrastructureError extends Error {
  readonly name = 'RateLimiterInfrastructureError';

  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message, { cause });
  }
}

export class RateLimiterConsistencyError extends Error {
  readonly name = 'RateLimiterConsistencyError';
}

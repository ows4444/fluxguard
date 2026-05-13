export class RateLimiterConfigurationError extends Error {
  override readonly name = 'RateLimiterConfigurationError';
}

export class RateLimiterConsistencyError extends Error {
  override readonly name = 'RateLimiterConsistencyError';
}

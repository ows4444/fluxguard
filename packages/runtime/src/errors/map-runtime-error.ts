import { RateLimiterError, RateLimiterInfrastructureError } from '@fluxguard/contracts';

export function mapRuntimeError(error: unknown): RateLimiterError {
  if (error instanceof RateLimiterError) {
    return error;
  }

  if (error instanceof Error) {
    return new RateLimiterInfrastructureError(error.message, {
      cause: error,
    });
  }

  return new RateLimiterInfrastructureError('Unknown runtime failure', {
    cause: error,
  });
}

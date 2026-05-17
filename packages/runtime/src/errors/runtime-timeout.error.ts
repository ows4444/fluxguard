import { RateLimiterInfrastructureError } from '@fluxguard/contracts';

export class RuntimeTimeoutError extends RateLimiterInfrastructureError {
  override readonly code = 'RUNTIME_TIMEOUT';

  constructor(operation: string, timeoutMs: number) {
    super(`Runtime operation "${operation}" exceeded timeout (${timeoutMs}ms)`, {
      retryable: true,
    });
  }

  override readonly name = 'RuntimeTimeoutError';
}

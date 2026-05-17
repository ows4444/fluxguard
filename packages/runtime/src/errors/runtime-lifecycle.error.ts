import { RateLimiterInfrastructureError } from '@fluxguard/contracts';

export class RuntimeLifecycleError extends RateLimiterInfrastructureError {
  override readonly name = 'RuntimeLifecycleError';

  constructor(message: string) {
    super(message);
  }
}

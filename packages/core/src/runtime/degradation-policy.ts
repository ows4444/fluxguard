import type { RateLimitEnforcement, StoreFailure } from '@fluxguard/contracts';

type DegradedEnforcement = Extract<RateLimitEnforcement, { readonly type: 'degraded' }>;

export interface DegradationPolicy {
  createEnforcement(failure: StoreFailure): DegradedEnforcement;
}

export class FailOpenDegradationPolicy implements DegradationPolicy {
  createEnforcement(failure: StoreFailure): DegradedEnforcement {
    return {
      type: 'degraded',
      failOpen: true,
      storeFailureType: failure.type,
    };
  }
}

export class FailClosedDegradationPolicy implements DegradationPolicy {
  createEnforcement(failure: StoreFailure): DegradedEnforcement {
    return {
      type: 'degraded',
      failOpen: false,
      storeFailureType: failure.type,
    };
  }
}

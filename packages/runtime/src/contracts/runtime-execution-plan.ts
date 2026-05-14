import type { RateLimitContext } from '@fluxguard/contracts';

import type { RuntimeLimiterDefinition } from '../core';

export interface RuntimeExecutionPlan {
  readonly definitions: readonly RuntimeLimiterDefinition[];

  readonly context: RateLimitContext;
}

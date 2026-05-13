import type { RateLimitKind } from '@fluxguard/contracts';

import type { RuntimeBlockingPolicy, RuntimeLimiterConfig, RuntimeProgressiveBlockingPolicy } from '../../config/index';

export interface RuntimeCompiledDefinition {
  readonly kind: RateLimitKind;

  readonly runtime: RuntimeLimiterConfig;

  readonly blocking?: RuntimeBlockingPolicy;

  readonly progressiveBlocking?: RuntimeProgressiveBlockingPolicy;
}

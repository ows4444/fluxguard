import type { RateLimitConfig } from '@fluxguard/contracts';

import type { RuntimeCompiledDefinition } from '../definitions/runtime-compiled.definition';
import type { RuntimeExecutionDescriptor } from '../definitions/runtime-execution-descriptor';

export interface RuntimeLimiterDefinition {
  readonly name: string;

  readonly config: RateLimitConfig;

  readonly compiled: RuntimeCompiledDefinition;

  readonly descriptor: RuntimeExecutionDescriptor;
}

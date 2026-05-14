import type { RuntimeLimiterDefinition } from '../../core';

export interface RuntimeExecutionNode {
  readonly limiter: RuntimeLimiterDefinition;

  readonly priority: number;

  readonly concurrencyGroup?: string;

  readonly terminal: boolean;
}

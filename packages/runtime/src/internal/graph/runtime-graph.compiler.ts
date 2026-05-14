import type { RuntimeLimiterDefinition } from '../../core';
import type { RuntimeExecutionGraph } from './runtime-execution.graph';

export class RuntimeGraphCompiler {
  compile(definitions: readonly RuntimeLimiterDefinition[]): RuntimeExecutionGraph {
    const ordered = [...definitions].sort((a, b) => b.descriptor.execution.priority - a.descriptor.execution.priority);

    return {
      nodes: ordered.map((definition, index) => ({
        limiter: definition,

        priority: definition.descriptor.execution.priority,

        ...(definition.descriptor.execution.concurrencyGroup
          ? { concurrencyGroup: definition.descriptor.execution.concurrencyGroup }
          : {}),

        terminal: index === ordered.length - 1,
      })),
    };
  }
}

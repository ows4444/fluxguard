import type { RuntimeExecutionNode } from './runtime-execution.node';

export interface RuntimeExecutionGraph {
  readonly nodes: readonly RuntimeExecutionNode[];
}

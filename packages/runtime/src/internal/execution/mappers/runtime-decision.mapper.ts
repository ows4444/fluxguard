import { type AdvisoryPeekResult, type ConsumeResult, DecisionOutcome, type PeekResult } from '@fluxguard/contracts';

import type { RuntimeExecutionResult } from '../runtime-execution-context';

export class RuntimeDecisionMapper {
  toConsumeResult(execution: RuntimeExecutionResult): ConsumeResult {
    const { algorithm } = execution;

    return {
      key: execution.context.key,

      outcome: algorithm.blocked
        ? DecisionOutcome.BLOCKED
        : algorithm.allowed
          ? DecisionOutcome.ALLOWED
          : DecisionOutcome.REJECTED,

      remainingPoints: algorithm.remaining,

      msBeforeNext: Math.max(0, algorithm.retryAfter),
    };
  }

  toAdvisoryPeekResult(execution: RuntimeExecutionResult): AdvisoryPeekResult {
    return {
      ...this.toConsumeResult(execution),

      consistency: 'advisory',
    };
  }

  toPeekResult(execution: RuntimeExecutionResult): PeekResult {
    if (execution.context.definition.descriptor.execution.scopeKind === 'global') {
      return {
        ...this.toConsumeResult(execution),

        consistency: 'consistent',
      };
    }

    return {
      ...this.toConsumeResult(execution),

      consistency: 'advisory',
    };
  }
}

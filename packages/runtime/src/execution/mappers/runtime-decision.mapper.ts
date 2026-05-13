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

      msBeforeNext: algorithm.retryAfter,
    };
  }

  toAdvisoryPeekResult(execution: RuntimeExecutionResult): AdvisoryPeekResult {
    return {
      ...this.toConsumeResult(execution),

      consistency: 'advisory',
    };
  }

  toPeekResult(execution: RuntimeExecutionResult): PeekResult {
    return this.toAdvisoryPeekResult(execution);
  }
}

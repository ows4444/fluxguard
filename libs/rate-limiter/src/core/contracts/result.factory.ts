import { DecisionOutcome } from './decision-outcome';

import type { AdvisoryPeekResult, ConsistentPeekResult, ConsumeResult } from './result.types';

export class ResultFactory {
  static allowed(key: string, remainingPoints: number | null, msBeforeNext = 0): ConsumeResult {
    return {
      key,
      outcome: DecisionOutcome.ALLOWED,
      remainingPoints,
      msBeforeNext,
    };
  }

  static rejected(key: string, remainingPoints: number | null, msBeforeNext: number): ConsumeResult {
    return {
      key,
      outcome: DecisionOutcome.REJECTED,
      remainingPoints,
      msBeforeNext,
    };
  }

  static blocked(key: string, remainingPoints: number | null, msBeforeNext: number): ConsumeResult {
    return {
      key,
      outcome: DecisionOutcome.BLOCKED,
      remainingPoints,
      msBeforeNext,
    };
  }

  static degradedAllowed(key: string): ConsumeResult {
    return {
      key,
      outcome: DecisionOutcome.DEGRADED_ALLOWED,
      remainingPoints: null,
      msBeforeNext: 0,
    };
  }

  static degradedRejected(key: string, msBeforeNext = 1000): ConsumeResult {
    return {
      key,
      outcome: DecisionOutcome.DEGRADED_REJECTED,
      remainingPoints: 0,
      msBeforeNext,
    };
  }

  static advisory(result: ConsumeResult): AdvisoryPeekResult {
    return {
      ...result,
      consistency: 'advisory',
    };
  }

  static consistent(result: ConsumeResult): ConsistentPeekResult {
    return {
      ...result,
      consistency: 'consistent',
    };
  }
}

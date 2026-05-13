import {
  type AdvisoryPeekResult,
  type ConsistentPeekResult,
  type ConsumeResult,
  DecisionOutcome,
} from '@fluxguard/contracts';

export function allowedResult(key: string, remainingPoints: number | null, msBeforeNext = 0): ConsumeResult {
  return {
    key,
    outcome: DecisionOutcome.ALLOWED,
    remainingPoints,
    msBeforeNext,
  };
}

export function rejectedResult(key: string, remainingPoints: number | null, msBeforeNext: number): ConsumeResult {
  return {
    key,
    outcome: DecisionOutcome.REJECTED,
    remainingPoints,
    msBeforeNext,
  };
}

export function blockedResult(key: string, remainingPoints: number | null, msBeforeNext: number): ConsumeResult {
  return {
    key,
    outcome: DecisionOutcome.BLOCKED,
    remainingPoints,
    msBeforeNext,
  };
}

export function degradedAllowedResult(key: string): ConsumeResult {
  return {
    key,
    outcome: DecisionOutcome.DEGRADED_ALLOWED,
    remainingPoints: null,
    msBeforeNext: 0,
  };
}

export function degradedRejectedResult(key: string, msBeforeNext = 1000): ConsumeResult {
  return {
    key,
    outcome: DecisionOutcome.DEGRADED_REJECTED,
    remainingPoints: 0,
    msBeforeNext,
  };
}

export function advisoryResult(result: ConsumeResult): AdvisoryPeekResult {
  return {
    ...result,
    consistency: 'advisory',
  };
}

export function consistentResult(result: ConsumeResult): ConsistentPeekResult {
  return {
    ...result,
    consistency: 'consistent',
  };
}

import { type ConsumeResult, DecisionOutcome } from '@fluxguard/contracts';

export function outcomeFromAllowed(allowed: boolean): DecisionOutcome {
  return allowed ? DecisionOutcome.ALLOWED : DecisionOutcome.REJECTED;
}

export function outcomeFromBlocked(blocked: boolean, allowed: boolean): DecisionOutcome {
  if (blocked) {
    return DecisionOutcome.BLOCKED;
  }

  return outcomeFromAllowed(allowed);
}

export function isAllowed(result: ConsumeResult): boolean {
  return result.outcome === DecisionOutcome.ALLOWED || result.outcome === DecisionOutcome.DEGRADED_ALLOWED;
}

export function isRejected(result: ConsumeResult): boolean {
  return result.outcome === DecisionOutcome.REJECTED || result.outcome === DecisionOutcome.DEGRADED_REJECTED;
}

export function isBlocked(result: ConsumeResult): boolean {
  return result.outcome === DecisionOutcome.BLOCKED;
}

export function isDegraded(result: ConsumeResult): boolean {
  return result.outcome === DecisionOutcome.DEGRADED_ALLOWED || result.outcome === DecisionOutcome.DEGRADED_REJECTED;
}

export function shouldStopExecution(result: ConsumeResult): boolean {
  return !isAllowed(result);
}

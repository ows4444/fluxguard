import {
  DECISION_OUTCOME,
  type DecisionOutcome,
  durationMilliseconds,
  type RateLimitDecision,
  type RateLimitKind,
  type RuntimeDecisionEvent,
  type RuntimeFailureEvent,
  type UnixTimestampMs,
} from '@fluxguard/contracts';

interface CreateDecisionEventOptions {
  readonly key: string;

  readonly correlationId?: string;

  readonly kind: RateLimitKind;
  readonly decision: RateLimitDecision;
  readonly durationMs: number;
  readonly limiterName: string;
  readonly timestamp: UnixTimestampMs;
}

function isBlockedOutcome(outcome: DecisionOutcome): boolean {
  return outcome === DECISION_OUTCOME.BLOCKED || outcome === DECISION_OUTCOME.REJECTED;
}

function isDegradedOutcome(outcome: string): boolean {
  return outcome === DECISION_OUTCOME.DEGRADED_ALLOWED || outcome === DECISION_OUTCOME.DEGRADED_REJECTED;
}

export function createDecisionEvent(options: CreateDecisionEventOptions): RuntimeDecisionEvent {
  const { timestamp, durationMs, limiterName, key, kind, decision } = options;

  return {
    timestamp,
    durationMs: durationMilliseconds(durationMs),
    limiterName,
    key,
    kind,
    outcome: decision.outcome,
    remainingPoints: decision.remainingPoints,
    blocked: isBlockedOutcome(decision.outcome),
    degraded: isDegradedOutcome(decision.outcome),
    retryAfterMs: decision.msBeforeNext,
    correlationId: options.correlationId,
  };
}

interface CreateFailureEventOptions {
  readonly key: string;
  readonly durationMs: number;
  readonly limiterName: string;
  readonly reason: string;
  readonly timestamp: UnixTimestampMs;
}

export function createFailureEvent(options: CreateFailureEventOptions): RuntimeFailureEvent {
  return {
    timestamp: options.timestamp,
    durationMs: durationMilliseconds(options.durationMs),
    limiterName: options.limiterName,
    key: options.key,
    reason: options.reason,
  };
}

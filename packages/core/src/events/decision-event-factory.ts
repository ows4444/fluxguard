import { randomUUID } from 'node:crypto';

import {
  assertNever,
  type Clock,
  DEFAULT_REQUEST_COST,
  type EventContext,
  RATE_LIMIT_EVENT_SCHEMA_VERSION,
  type RateLimitDecision,
  type RateLimitEvaluationSnapshot,
  type RateLimitEvent,
  type RateLimitEventType,
  type RateLimitRequest,
} from '@fluxguard/contracts';

import type { EventPublisherConfig } from '../rate-limiter';

function createBasePayload(
  request: RateLimitRequest,
  evaluationDurationUs: number,
  evaluation: RateLimitEvaluationSnapshot,
) {
  return {
    ip: request.ip,
    method: request.method,
    route: request.route,
    cost: request.cost ?? DEFAULT_REQUEST_COST,
    evaluationDurationUs,
    evaluation,
    ...(request.apiKeyId && { apiKeyId: request.apiKeyId }),
    ...(request.userId && { userId: request.userId }),
  };
}

export function createDecisionEvent(
  decision: RateLimitDecision,
  request: RateLimitRequest,
  cfg: EventPublisherConfig,
  clock: Clock,
  context?: EventContext,
  occurredAtMs = clock.nowMs(),
): RateLimitEvent | null {
  const envelope = <T extends RateLimitEventType>(type: T) => ({
    id: randomUUID(),
    type,
    producer: cfg.producer,
    producerVersion: cfg.producerVersion,
    occurredAtMs,
    schemaVersion: RATE_LIMIT_EVENT_SCHEMA_VERSION[type],
    ...(context?.correlationId ? { correlationId: context.correlationId } : {}),
    ...(context?.causationId ? { causationId: context.causationId } : {}),
    ...(context?.traceId ? { traceId: context.traceId } : {}),
    ...(context?.spanId ? { spanId: context.spanId } : {}),
    ...(cfg.environment ? { environment: cfg.environment } : {}),
    ...(cfg.region ? { region: cfg.region } : {}),
  });

  if (decision.type === 'policy_miss') {
    return {
      ...envelope('rate_limit.policy_miss'),
      payload: {
        method: request.method,
        route: request.route,
      },
    };
  }

  if (decision.type === 'rule_miss') {
    return {
      ...envelope('rate_limit.rule_miss'),
      payload: {
        method: request.method,
        route: request.route,
      },
    };
  }

  if (decision.type === 'bypass') {
    return {
      ...envelope('rate_limit.bypassed'),
      payload: {
        ip: request.ip,
        method: request.method,
        route: request.route,
        cost: request.cost ?? DEFAULT_REQUEST_COST,
        evaluationDurationUs: decision.diagnostics?.totalEvaluationDurationUs ?? 0,
        bypassReason: decision.reason,
        ...(request.apiKeyId ? { apiKeyId: request.apiKeyId } : {}),
        ...(request.userId ? { userId: request.userId } : {}),
      },
    };
  }

  if (decision.type === 'degraded') {
    return {
      ...envelope('rate_limit.degraded'),
      payload: {
        failOpen: decision.enforcement.failOpen,
        storeFailureType: decision.enforcement.storeFailureType,

        ...(decision.evaluation
          ? {
              evaluation: {
                ...(decision.evaluation.ruleId !== undefined ? { ruleId: decision.evaluation.ruleId } : {}),
                ...(decision.evaluation.remaining !== undefined ? { remaining: decision.evaluation.remaining } : {}),
                ...(decision.evaluation.resetAtMs !== undefined ? { resetAtMs: decision.evaluation.resetAtMs } : {}),
                ...(decision.evaluation.stale !== undefined ? { stale: decision.evaluation.stale } : {}),
              },
            }
          : {}),

        ...(decision.failure.retryable !== undefined ? { retryable: decision.failure.retryable } : {}),
        ...(decision.failure.transient !== undefined ? { transient: decision.failure.transient } : {}),
        ...(decision.failure.operation !== undefined ? { operation: decision.failure.operation } : {}),
        ...(decision.failure.storeNode !== undefined ? { storeNode: decision.failure.storeNode } : {}),

        ip: request.ip,
        method: request.method,
        route: request.route,
        cost: request.cost ?? DEFAULT_REQUEST_COST,

        ...(decision.diagnostics?.totalEvaluationDurationUs !== undefined
          ? { evaluationDurationUs: decision.diagnostics.totalEvaluationDurationUs }
          : {}),

        ...(request.apiKeyId ? { apiKeyId: request.apiKeyId } : {}),
        ...(request.userId ? { userId: request.userId } : {}),
      },
    };
  }

  if (decision.type === 'shadow_only') {
    return null;
  }

  const evaluationPayload = createBasePayload(
    request,
    decision.diagnostics?.totalEvaluationDurationUs ?? 0,
    decision.evaluation,
  );

  switch (decision.enforcement.type) {
    case 'allow':
      return {
        ...envelope('rate_limit.allowed'),
        payload: evaluationPayload,
      };

    case 'allow_burst':
      return {
        ...envelope('rate_limit.allowed_burst'),
        payload: {
          ...evaluationPayload,
          burstRemaining: decision.enforcement.burstRemaining,
        },
      };

    case 'reject':
      return {
        ...envelope('rate_limit.rejected'),
        payload: {
          ...evaluationPayload,
          retryAfterMs: decision.enforcement.retryAfterMs,
        },
      };

    case 'throttle':
      return {
        ...envelope('rate_limit.throttled'),
        payload: {
          ...evaluationPayload,
          retryAfterMs: decision.enforcement.retryAfterMs,
          shedProbability: decision.enforcement.shedProbability,
        },
      };

    case 'shadow':
      return {
        ...envelope('rate_limit.shadow'),
        payload: evaluationPayload,
      };

    default:
      return assertNever(decision.enforcement);
  }
}

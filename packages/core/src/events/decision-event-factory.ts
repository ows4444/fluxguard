import { randomUUID } from 'node:crypto';

import {
  assertNever,
  type Clock,
  DEFAULT_REQUEST_COST,
  RATE_LIMIT_EVENT_SCHEMA_VERSION,
  type RateLimitDecision,
  type RateLimitEvent,
  type RateLimitEventType,
  type RateLimitRequest,
} from '@fluxguard/contracts';

import type { EventPublisherConfig } from '../rate-limiter';

export function createDecisionEvent(
  decision: RateLimitDecision,
  request: RateLimitRequest,
  cfg: EventPublisherConfig,
  clock: Clock,
): RateLimitEvent | null {
  if (decision.type === 'policy_miss') {
    return null;
  }

  const envelope = <T extends RateLimitEventType>(type: T) => ({
    id: randomUUID(),
    type,
    producer: cfg.producer,
    producerVersion: cfg.producerVersion,
    occurredAtMs: clock.nowMs(),
    schemaVersion: RATE_LIMIT_EVENT_SCHEMA_VERSION[type],
    ...(cfg.environment ? { environment: cfg.environment } : {}),
    ...(cfg.region ? { region: cfg.region } : {}),
  });

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
        failedOpen: decision.enforcement.failOpen,
        storeFailureType: decision.enforcement.storeFailureType,

        ...(decision.diagnostics?.totalEvaluationDurationUs !== undefined
          ? { evaluationDurationUs: decision.diagnostics.totalEvaluationDurationUs }
          : {}),

        ...(request.apiKeyId ? { apiKeyId: request.apiKeyId } : {}),
        ...(request.userId ? { userId: request.userId } : {}),
      },
    };
  }

  const evaluationPayload = {
    ip: request.ip,
    method: request.method,
    route: request.route,
    cost: request.cost ?? DEFAULT_REQUEST_COST,
    evaluationDurationUs: decision.diagnostics?.totalEvaluationDurationUs ?? 0,
    evaluation: decision.evaluation,
    ...(request.apiKeyId ? { apiKeyId: request.apiKeyId } : {}),
    ...(request.userId ? { userId: request.userId } : {}),
  };

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
      return assertNever(decision.enforcement.type);
  }
}

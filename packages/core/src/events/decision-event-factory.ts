import {
  type Clock,
  DEFAULT_REQUEST_COST,
  type EventContext,
  type RateLimitDecision,
  type RateLimitEvent,
  type RateLimitRequest,
} from '@fluxguard/contracts';

import type { EventPublisherConfig } from '../rate-limiter';
import { createEventEnvelope } from './event-envelope';
import { createBaseEvaluationPayload } from './event-payloads';
import { createEventSubject } from './event-subject';
import { DECISION_EVENT_TYPES } from './event-type-map';
import { createSuccessEvent } from './success-event-builder';

export function createDecisionEvent(
  decision: RateLimitDecision,
  request: RateLimitRequest,
  cfg: EventPublisherConfig,
  clock: Clock,
  context?: EventContext,
  occurredAtMs = clock.nowMs(),
): RateLimitEvent | null {
  if (decision.type === 'policy_miss') {
    return {
      ...createEventEnvelope(DECISION_EVENT_TYPES.policy_miss, cfg, occurredAtMs, context),
      payload: {
        method: request.method,
        route: request.route,
      },
    };
  }

  if (decision.type === 'rule_miss') {
    return {
      ...createEventEnvelope(DECISION_EVENT_TYPES.rule_miss, cfg, occurredAtMs, context),
      payload: {
        method: request.method,
        route: request.route,
      },
    };
  }

  if (decision.type === 'bypass') {
    return {
      ...createEventEnvelope(DECISION_EVENT_TYPES.bypass, cfg, occurredAtMs, context),
      payload: {
        ip: request.ip,
        method: request.method,
        route: request.route,
        cost: request.cost ?? DEFAULT_REQUEST_COST,
        evaluationDurationUs: decision.diagnostics?.totalEvaluationDurationUs,
        bypassReason: decision.reason,
        ...createEventSubject(request),
      },
    };
  }

  if (decision.type === 'degraded') {
    return {
      ...createEventEnvelope(DECISION_EVENT_TYPES.degraded, cfg, occurredAtMs, context),
      payload: {
        failOpen: decision.enforcement.failOpen,
        storeFailureType: decision.enforcement.storeFailureType,

        ...(decision.evaluation ? { evaluation: decision.evaluation } : {}),

        retryable: decision.failure.retryable,
        transient: decision.failure.transient,

        ...(decision.failure.operation !== undefined ? { operation: decision.failure.operation } : {}),
        ...(decision.failure.storeNode !== undefined ? { storeNode: decision.failure.storeNode } : {}),

        ip: request.ip,
        method: request.method,
        route: request.route,
        cost: request.cost ?? DEFAULT_REQUEST_COST,

        evaluationDurationUs: decision.diagnostics?.totalEvaluationDurationUs,

        ...createEventSubject(request),
      },
    };
  }

  if (decision.type === 'shadow_only') {
    return null;
  }

  const evaluationPayload = createBaseEvaluationPayload(
    request,
    decision.diagnostics ?? {
      totalEvaluationDurationUs: 0,
    },
    decision.evaluation,
  );

  return createSuccessEvent(decision, evaluationPayload, (type) =>
    createEventEnvelope(type, cfg, occurredAtMs, context),
  );
}

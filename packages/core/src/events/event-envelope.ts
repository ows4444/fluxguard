import { randomUUID } from 'node:crypto';

import { type EventContext, RATE_LIMIT_EVENT_SCHEMA_VERSION, type RateLimitEventType } from '@fluxguard/contracts';

import type { EventPublisherConfig } from '../rate-limiter';

export function createEventEnvelope<T extends RateLimitEventType>(
  type: T,
  cfg: EventPublisherConfig,
  occurredAtMs: number,
  context?: EventContext,
) {
  return {
    id: randomUUID(),
    type,
    producer: cfg.producer,
    producerVersion: cfg.producerVersion,
    occurredAtMs,
    schemaVersion: RATE_LIMIT_EVENT_SCHEMA_VERSION[type],

    ...(context?.correlationId && { correlationId: context.correlationId }),

    ...(context?.causationId && { causationId: context.causationId }),

    ...(context?.traceId && { traceId: context.traceId }),

    ...(context?.spanId && { spanId: context.spanId }),

    ...(cfg.environment && { environment: cfg.environment }),

    ...(cfg.region && { region: cfg.region }),
  };
}

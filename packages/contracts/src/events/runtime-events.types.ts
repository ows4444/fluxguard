import type { DurationMilliseconds } from '../primitives';
import type { DurationEvent, TimestampedEvent } from './event-base.types';
import type { BaseDecisionEvent } from './rate-limit-decision.event';

export interface RuntimeDecisionEvent extends BaseDecisionEvent, DurationEvent, TimestampedEvent {
  readonly correlationId?: string;

  readonly blocked: boolean;
  readonly degraded: boolean;
  readonly retryAfterMs: DurationMilliseconds;

  readonly open?: boolean;
}

export interface RuntimeFailureEvent extends DurationEvent, TimestampedEvent {
  readonly key: string;

  readonly limiterName: string;
  readonly reason: string;
}

export interface RuntimeStoreHealthEvent extends TimestampedEvent {
  readonly degraded: boolean;
  readonly healthy: boolean;
  readonly latencyMs?: DurationMilliseconds;
  readonly reason?: string;
}

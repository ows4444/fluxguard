import type { RuntimeOperation } from '../runtime/runtime-operation.types';
import type { DurationEvent, IntervalEvent, TimestampedEvent } from './event-base.types';

export interface RuntimeExecutionMetricsEvent extends DurationEvent, TimestampedEvent {
  readonly limiterName: string;

  readonly success: boolean;

  readonly degraded: boolean;

  readonly blocked: boolean;
}

export interface RuntimeTracingEvent extends IntervalEvent {
  readonly limiterName: string;

  readonly operation: RuntimeOperation;

  readonly success: boolean;

  readonly error?: string;
}

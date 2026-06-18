import type { RateLimitEvent } from './event.contract';

export interface EventPublisherHealthReport {
  readonly status: 'healthy' | 'degraded' | 'unavailable';

  readonly checkedAtMs: number;
}

export interface EventPublisher {
  publish(event: RateLimitEvent): Promise<void>;

  publishBatch?(events: ReadonlyArray<RateLimitEvent>): Promise<void>;

  health?(): Promise<EventPublisherHealthReport>;
}

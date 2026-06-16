import type { RateLimitEvent } from './event.contract';

export interface EventPublisher {
  publish(event: RateLimitEvent): Promise<void>;
}

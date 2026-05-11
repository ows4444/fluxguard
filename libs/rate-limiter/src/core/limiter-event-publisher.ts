import { Injectable, Logger } from '@nestjs/common';
import type { RateLimitDecisionEvent } from '../module/rate-limiter.interfaces';

@Injectable()
export class LimiterEventPublisher {
  private readonly logger = new Logger(LimiterEventPublisher.name);
  private readonly queue: RateLimitDecisionEvent[] = [];

  private readonly maxQueueSize = 10_000;

  private readonly processingChunkSize = 250;

  private droppedEvents = 0;

  private scheduled = false;

  private lastDropWarningAt = 0;

  publish(handler: ((event: RateLimitDecisionEvent) => void) | undefined, event: RateLimitDecisionEvent): void {
    if (!handler) {
      return;
    }

    if (this.queue.length >= this.maxQueueSize) {
      this.droppedEvents += 1;

      const now = Date.now();

      if (now - this.lastDropWarningAt >= 10000) {
        this.lastDropWarningAt = now;

        this.logger.warn(
          JSON.stringify({
            event: 'rate_limiter_event_drop',
            droppedEvents: this.droppedEvents,
            queueSize: this.queue.length,
            maxQueueSize: this.maxQueueSize,
          }),
        );
      }

      return;
    }

    this.queue.push(event);

    if (this.scheduled) {
      return;
    }

    this.scheduled = true;

    setImmediate(() => {
      this.scheduled = false;

      const items = this.queue.splice(0, this.queue.length);

      void this.processChunked(handler, items);
    });
  }

  private async processChunked(
    handler: (event: RateLimitDecisionEvent) => void,
    items: RateLimitDecisionEvent[],
  ): Promise<void> {
    for (let i = 0; i < items.length; i += this.processingChunkSize) {
      const chunk = items.slice(i, i + this.processingChunkSize);

      for (const item of chunk) {
        try {
          handler(item);
        } catch (err) {
          this.logger.error(`Decision subscriber failed: ${String(err)}`);
        }
      }

      await new Promise<void>((resolve) => {
        setImmediate(resolve);
      });
    }
  }
}

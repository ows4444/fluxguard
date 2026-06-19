import type { EventContext } from '../events/event.contract';

export interface RateLimiterResetCommand {
  readonly context?: EventContext;
  readonly keyPrefix?: string;
}

export interface ResetResult {
  readonly deletedCount: number;
  readonly deletedIdempotencyKeys?: number;
}

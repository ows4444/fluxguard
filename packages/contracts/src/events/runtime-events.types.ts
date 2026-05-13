import type { RateLimitKind } from '../config/rate-limit.types';
import type { DecisionOutcome } from '../decisions/decision-outcome';

export interface RuntimeDecisionEvent {
  readonly limiter: string;

  readonly key: string;

  readonly outcome: DecisionOutcome;

  readonly kind: RateLimitKind;

  readonly remaining: number | null;

  readonly retryAfter: number;

  readonly durationMs: number;

  readonly degraded: boolean;

  readonly blocked: boolean;

  readonly timestamp: number;
}

export interface RuntimeFailureEvent {
  readonly limiter: string;

  readonly key: string;

  readonly reason: string;

  readonly timestamp: number;

  readonly durationMs: number;
}

export interface RuntimeStoreHealthEvent {
  readonly healthy: boolean;

  readonly degraded: boolean;

  readonly latencyMs?: number;

  readonly timestamp: number;

  readonly reason?: string;
}

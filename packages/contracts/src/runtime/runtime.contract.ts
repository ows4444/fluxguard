import type { AlgorithmState } from '../domain/algorithm-state.contract';
import type { PeekConsistency } from '../store/store.command';
import type { TracingContext } from './tracing.contract';

export interface Clock {
  calendarWindowResetAtMs(timezone: string, anchorDay?: number): number;
  calendarWindowStartMs(timezone: string, anchorDay?: number): number;
  capabilities(): ClockCapabilities;
  monotonicUs(): number;
  nowMs(): number;
  windowStartMs(windowMs: number): number;
}

export interface ClockCapabilities {
  readonly supportsCalendarMonthWindow: boolean;
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

export type RequestMetadataKey = `x-${string}`;

export type RequestMetadata = Readonly<Record<RequestMetadataKey, string>>;

export const DEFAULT_REQUEST_COST = 1;

export type RequestTracingContext = TracingContext;

export const REQUEST_METADATA_LIMITS = Object.freeze({
  maxEntries: 32,
  maxKeyLength: 64,
  maxValueLength: 512,
} as const);

export interface RateLimitRequest {
  readonly idempotencyKey?: string;

  readonly apiKeyId?: string;

  readonly userId?: string;
  readonly cost?: number;
  readonly ip: string;
  readonly meta?: RequestMetadata;
  readonly method: HttpMethod;
  readonly route: string;

  readonly tracing?: RequestTracingContext;
}

export interface RateLimitSnapshot {
  readonly consistency: PeekConsistency;
  readonly limit: number;
  readonly remaining: number;
  readonly resetAtMs?: number;

  readonly algorithmState?: AlgorithmState;
}

import type { PeekConsistency } from '../store/store.command';

export interface Clock {
  monotonicUs(): number;
  nowMs(): number;
  windowStartMs(windowMs: number): number;
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

export type RequestMetadataKey = `x-${string}`;

export type RequestMetadata = Readonly<Record<RequestMetadataKey, string>>;

export const REQUEST_METADATA_LIMITS = Object.freeze({
  maxEntries: 32,
  maxKeyLength: 64,
  maxValueLength: 512,
} as const);

export interface RateLimitRequest {
  readonly apiKeyId?: string;

  readonly userId?: string;
  readonly cost?: number;
  readonly ip: string;
  readonly meta?: RequestMetadata;
  readonly method: HttpMethod;
  readonly route: string;
}

export interface RateLimitSnapshot {
  readonly consistency: PeekConsistency;
  readonly limit: number;
  readonly remaining: number;
  readonly resetAtMs: number;
}

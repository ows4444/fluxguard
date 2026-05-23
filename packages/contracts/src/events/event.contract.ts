import type { BypassReason, RateLimitEvaluationSnapshot } from '../domain/rate-limit.shared';
import type { HttpMethod } from '../runtime/runtime.contract';
import type { StoreFailureType } from '../store/store.failure';
import { RATE_LIMIT_EVENT_SCHEMA_VERSION } from './event.constants';

export interface RateLimitEventPayloadMap {
  'rate_limit.allowed': RateLimitAllowedEventPayload;
  'rate_limit.allowed_burst': RateLimitAllowedBurstEventPayload;
  'rate_limit.bypassed': RateLimitBypassedEventPayload;
  'rate_limit.degraded': RateLimitDegradedEventPayload;
  'rate_limit.rejected': RateLimitRejectedEventPayload;
  'rate_limit.reset': RateLimitResetEventPayload;
  'rate_limit.rule_miss': RateLimitRuleMissEventPayload;
  'rate_limit.shadow': RateLimitShadowEventPayload;
  'rate_limit.store_timeout': RateLimitStoreTimeoutEventPayload;
  'rate_limit.throttled': RateLimitThrottledEventPayload;
}

export type RateLimitEventType = keyof RateLimitEventPayloadMap;
export type RateLimitEvent = {
  [K in keyof RateLimitEventPayloadMap]: EventEnvelope<K, RateLimitEventPayloadMap[K]>;
}[keyof RateLimitEventPayloadMap];

export interface EventEnvelope<TType extends RateLimitEventType, TPayload> {
  readonly id: string;

  readonly environment?: string;
  readonly producer: string;
  readonly producerVersion: string;

  readonly region?: string;

  readonly occurredAtMs: number;

  readonly schemaVersion: (typeof RATE_LIMIT_EVENT_SCHEMA_VERSION)[TType];

  readonly type: TType;

  readonly causationId?: string;
  readonly correlationId?: string;
  readonly spanId?: string;
  readonly traceId?: string;

  readonly payload: TPayload;
}

export interface BaseRateLimitEventPayload {
  readonly apiKeyId?: string;

  readonly userId?: string;

  readonly cost: number;
  readonly evaluationDurationUs: number;

  readonly ip: string;

  readonly method: HttpMethod;

  readonly route: string;

  readonly evaluation: RateLimitEvaluationSnapshot;
}

export type RateLimitAllowedEventPayload = BaseRateLimitEventPayload;

export interface RateLimitAllowedBurstEventPayload extends BaseRateLimitEventPayload {
  readonly burstRemaining: number;
}

export interface RateLimitRejectedEventPayload extends BaseRateLimitEventPayload {
  readonly retryAfterMs: number;
}

export interface RateLimitThrottledEventPayload extends BaseRateLimitEventPayload {
  readonly retryAfterMs: number;
  readonly shedProbability: number;
}

export interface RateLimitBypassedEventPayload extends BaseRateLimitEventPayload {
  readonly bypassReason: BypassReason;
}

export interface RateLimitDegradedEventPayload {
  readonly apiKeyId?: string;
  readonly userId?: string;

  readonly ip?: string;
  readonly method?: HttpMethod;
  readonly route?: string;

  readonly evaluation?: RateLimitEvaluationSnapshot;

  readonly cost?: number;
  readonly evaluationDurationUs?: number;

  readonly failedOpen: boolean;
  readonly storeFailureType: StoreFailureType;
}

export type RateLimitShadowEventPayload = BaseRateLimitEventPayload;

export interface RateLimitRuleMissEventPayload {
  readonly method: HttpMethod;
  readonly route: string;
}

export interface RateLimitStoreTimeoutEventPayload {
  readonly timeoutMs: number;
}

export interface RateLimitResetEventPayload {
  readonly deletedKeys: number;
}

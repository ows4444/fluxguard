import type { QuotaAlgorithm } from './rate-limit.types';

export type FailBehavior = 'open' | 'closed';

export interface BurstConfig {
  readonly burstDuration: number;
  readonly burstPoints: number;
}

export interface ProgressiveBlockingConfig {
  enabled?: boolean;
  initialBlockSeconds: number;
  maxBlockSeconds: number;
  multiplier: number;
  violationTtlSeconds: number;
}

interface BaseRateLimitConfig {
  allowKeyOverride?: boolean;
  allowManualAdjustments?: boolean;
  concurrencyGroup?: string;
  critical?: boolean;
  degradedAllowancePerSecond?: number;
  enabled?: boolean;
  errorCode?: string;
  executionTimeoutMs?: number;
  exposeInHeaders?: boolean;
  failBehavior?: FailBehavior;
  ignoreKeyOverride?: boolean;
  keySegments?: Array<'ip' | 'userId' | 'deviceId'>;
  message?: string | ((retryAfter: number) => string);
  priority?: number;
}

export interface QuotaRateLimitConfig extends BaseRateLimitConfig {
  kind: 'quota';
  duration: number;
  points: number;

  algorithm?: QuotaAlgorithm;
  blockDuration?: number;
  blockMultiplier?: number;
  burst?: BurstConfig;
  progressiveBlocking?: ProgressiveBlockingConfig;
}

export interface GlobalRateLimitConfig extends BaseRateLimitConfig {
  kind: 'global';
  duration: number;
  points: number;

  algorithm?: never;
  blockDuration?: never;
  blockMultiplier?: never;
  burst?: never;
}

export interface CooldownRateLimitConfig extends BaseRateLimitConfig {
  kind: 'cooldown';
  duration: number;

  algorithm?: never;
  allowManualAdjustments?: never;
  blockDuration?: never;
  blockMultiplier?: never;
  burst?: never;
  points?: never;
}

export type RateLimitConfig = QuotaRateLimitConfig | GlobalRateLimitConfig | CooldownRateLimitConfig;

export interface RateLimitAdjustmentOptions {
  key: string;

  operationId?: string;
  amount?: number;
  metadata?: Record<string, unknown>;
  reason?: string;
}

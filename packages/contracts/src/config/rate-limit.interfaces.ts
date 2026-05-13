import type { QuotaAlgorithm } from './rate-limit.types';

export type FailBehavior = 'open' | 'closed';

export interface BurstConfig {
  burstPoints: number;
  burstDuration: number;
}

export interface ProgressiveBlockingConfig {
  enabled?: boolean;
  initialBlockSeconds: number;
  multiplier: number;
  maxBlockSeconds: number;
  violationTtlSeconds: number;
}

interface BaseRateLimitConfig {
  degradedAllowancePerSecond?: number;
  allowManualAdjustments?: boolean;
  allowKeyOverride?: boolean;
  critical?: boolean;
  enabled?: boolean;
  failBehavior?: FailBehavior;
  message?: string | ((retryAfter: number) => string);
  errorCode?: string;
  keySegments?: Array<'ip' | 'userId' | 'deviceId'>;
  ignoreKeyOverride?: boolean;
  exposeInHeaders?: boolean;
  executionTimeoutMs?: number;
  concurrencyGroup?: string;
  priority?: number;
}

export interface QuotaRateLimitConfig extends BaseRateLimitConfig {
  kind: 'quota';
  points: number;
  duration: number;
  algorithm?: QuotaAlgorithm;
  burst?: BurstConfig;
  blockDuration?: number;
  blockMultiplier?: number;
  progressiveBlocking?: ProgressiveBlockingConfig;
}

export interface GlobalRateLimitConfig extends BaseRateLimitConfig {
  kind: 'global';
  points: number;
  duration: number;

  algorithm?: never;
  burst?: never;
  blockDuration?: never;
  blockMultiplier?: never;
}

export interface CooldownRateLimitConfig extends BaseRateLimitConfig {
  kind: 'cooldown';
  duration: number;

  points?: never;
  algorithm?: never;
  burst?: never;
  blockDuration?: never;
  blockMultiplier?: never;
  allowManualAdjustments?: never;
}

export type RateLimitConfig = QuotaRateLimitConfig | GlobalRateLimitConfig | CooldownRateLimitConfig;

export interface RateLimitAdjustmentOptions {
  operationId?: string;
  key: string;
  amount?: number;
  reason?: string;
  metadata?: Record<string, unknown>;
}

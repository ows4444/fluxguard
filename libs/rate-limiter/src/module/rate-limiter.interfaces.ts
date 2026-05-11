import { InjectionToken, ModuleMetadata, OptionalFactoryDependency } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import type { QuotaAlgorithm, RateLimitKind } from './rate-limiter.types';
import { DecisionOutcome } from '../core/contracts/decision-outcome';

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
  kind?: 'quota';
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
export interface RateLimiterAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
  inject?: (InjectionToken | OptionalFactoryDependency)[];
  useFactory: (
    ...args: ConfigService<Record<string | symbol, unknown>, false>[]
  ) => RateLimiterModuleOptions | Promise<RateLimiterModuleOptions>;
}

export interface RateLimitAdjustmentOptions {
  operationId?: string;
  key: string;
  amount?: number;
  reason?: string;
  metadata?: Record<string, unknown>;
}

export interface RuntimeExecutionPolicy {
  readonly enabled: boolean;
  readonly priority: number;

  readonly timeoutMs: number;

  readonly concurrencyGroup?: string;

  readonly scopeKind: 'global' | 'route';
  readonly limiterKind: RateLimitKind;
}
export interface RuntimeResiliencePolicy {
  readonly critical: boolean;
  readonly failBehavior?: FailBehavior;
  readonly degradedAllowancePerSecond: number;
}
export interface RuntimeExposurePolicy {
  readonly exposeInHeaders: boolean;
  readonly message?: string | ((retryAfter: number) => string);
  readonly errorCode?: string;
}
export interface RuntimeAdjustmentPolicy {
  readonly allowManualAdjustments: boolean;
}
export interface RuntimeIdentityPolicy {
  readonly keySegments: readonly ('ip' | 'userId' | 'deviceId')[];
  readonly ignoreKeyOverride: boolean;
  readonly allowKeyOverride: boolean;
}
export interface RuntimeBlockingPolicy {
  readonly blockDurationSeconds: number;
  readonly multiplier: number;
  readonly maxBlockDurationSeconds: number;
}

export interface RuntimeProgressiveBlockingPolicy {
  readonly enabled: boolean;
  readonly initialBlockSeconds: number;
  readonly multiplier: number;
  readonly maxBlockSeconds: number;
  readonly violationTtlSeconds: number;
}

export interface FixedWindowRuntimeConfig {
  readonly algorithm: 'fixed';
  readonly limit: number;
  readonly durationMs: number;
}
export interface GcraRuntimeConfig {
  readonly algorithm: 'gcra';
  readonly emissionIntervalMs: number;
  readonly burstCapacity: number;
}
export interface BurstRuntimeConfig {
  readonly algorithm: 'burst';
  readonly limit: number;
  readonly sustainedDurationMs: number;
  readonly burstCapacity: number;
  readonly burstWindowMs: number;
}
export interface CooldownRuntimeConfig {
  readonly algorithm: 'cooldown';
  readonly durationMs: number;
}
export type RuntimeLimiterConfig =
  | FixedWindowRuntimeConfig
  | GcraRuntimeConfig
  | BurstRuntimeConfig
  | CooldownRuntimeConfig;
export interface RateLimiterModuleOptions {
  limiters: Record<string, RateLimitConfig>;
  contextResolver?: (req: Request) => Partial<RateLimitContext> | Promise<Partial<RateLimitContext>>;
  globalPrefix?: string;
  failBehavior?: FailBehavior;
  onDecision?: (event: RateLimitDecisionEvent) => void;
}
export interface RateLimitContext {
  ip?: string;
  userId?: string;
  deviceId?: string;
  keyOverride?: string;
  [extra: string]: string | undefined;
}
export interface RateLimitDecisionEvent {
  limiterName: string;
  outcome: DecisionOutcome;
  kind: RateLimitKind;
  remainingPoints: number | null;
  msBeforeNext: number;
  key: string;
}

import type { DurationMilliseconds, RateLimitPoints } from '../primitives';
import { QUOTA_ALGORITHM, RATE_LIMIT_KIND } from './rate-limit.types';
import type { NormalizedCooldownRateLimitConfig, NormalizedQuotaRateLimitConfig } from './rate-limit.validation';

export interface BaseCompiledState {
  readonly durationMs: DurationMilliseconds;
}

export interface GcraCompiledState extends BaseCompiledState {
  readonly burstCapacity: RateLimitPoints;
  readonly burstTolerance: DurationMilliseconds;
  readonly emissionInterval: DurationMilliseconds;
}

export type CompiledCooldownConfig = Extract<
  NormalizedCooldownRateLimitConfig,
  { readonly kind: typeof RATE_LIMIT_KIND.COOLDOWN }
> & {
  readonly compiled: BaseCompiledState;
};

export type CompiledFixedWindowConfig = Extract<
  NormalizedQuotaRateLimitConfig,
  { readonly algorithm: typeof QUOTA_ALGORITHM.FIXED }
> & {
  readonly compiled: BaseCompiledState;
};

export type CompiledGcraConfig = Extract<
  NormalizedQuotaRateLimitConfig,
  { readonly algorithm: typeof QUOTA_ALGORITHM.GCRA }
> & {
  readonly compiled: GcraCompiledState;
};

export type CompiledQuotaConfig = CompiledFixedWindowConfig | CompiledGcraConfig;
export type CompiledRateLimitConfig = CompiledCooldownConfig | CompiledQuotaConfig;

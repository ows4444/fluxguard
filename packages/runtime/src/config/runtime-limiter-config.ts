export interface FixedWindowRuntimeConfig {
  readonly algorithm: 'fixed';
  readonly durationMs: number;
  readonly limit: number;
}

export interface GcraRuntimeConfig {
  readonly algorithm: 'gcra';
  readonly burstCapacity: number;
  readonly emissionIntervalMs: number;
}

export interface BurstRuntimeConfig {
  readonly algorithm: 'burst';
  readonly burstCapacity: number;
  readonly burstWindowMs: number;
  readonly limit: number;
  readonly sustainedDurationMs: number;
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

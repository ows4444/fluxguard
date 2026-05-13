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

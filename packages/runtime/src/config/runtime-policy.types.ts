import type { FailBehavior, RateLimitKind } from '@fluxguard/contracts';

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
export interface RuntimeMetadataPolicy {
  readonly limiterName: string;

  readonly limiterKind: RateLimitKind;

  readonly tags?: readonly string[];
}

import type { FailBehavior, RateLimitKind } from '@fluxguard/contracts';

export interface RuntimeExecutionPolicy {
  readonly concurrencyGroup?: string;
  readonly enabled: boolean;
  readonly limiterKind: RateLimitKind;
  readonly priority: number;
  readonly scopeKind: 'global' | 'route';
  readonly timeoutMs: number;
}

export interface RuntimeResiliencePolicy {
  readonly critical: boolean;
  readonly degradedAllowancePerSecond: number;
  readonly failBehavior?: FailBehavior;
}

export interface RuntimeExposurePolicy {
  readonly errorCode?: string;
  readonly exposeInHeaders: boolean;
  readonly message?: string | ((retryAfter: number) => string);
}

export interface RuntimeAdjustmentPolicy {
  readonly allowManualAdjustments: boolean;
}

export interface RuntimeIdentityPolicy {
  readonly allowKeyOverride: boolean;
  readonly ignoreKeyOverride: boolean;
  readonly keySegments: readonly ('ip' | 'userId' | 'deviceId')[];
}

export interface RuntimeBlockingPolicy {
  readonly blockDurationSeconds: number;
  readonly maxBlockDurationSeconds: number;
  readonly multiplier: number;
}

export interface RuntimeProgressiveBlockingPolicy {
  readonly enabled: boolean;
  readonly initialBlockSeconds: number;
  readonly maxBlockSeconds: number;
  readonly multiplier: number;
  readonly violationTtlSeconds: number;
}
export interface RuntimeMetadataPolicy {
  readonly limiterName: string;

  readonly limiterKind: RateLimitKind;

  readonly tags?: readonly string[];
}

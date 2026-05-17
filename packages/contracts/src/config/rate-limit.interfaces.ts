import type { RateLimitKeySegment } from '../context/context.types';
import type {
  DurationMilliseconds,
  JsonValue,
  Priority,
  RateLimitPoints,
  ReadonlyList,
  ReadonlyRecord,
  Seconds,
} from '../primitives';
import { type QuotaAlgorithm, RATE_LIMIT_KIND } from './rate-limit.types';

export const FAIL_BEHAVIOR = { OPEN: 'open', CLOSED: 'closed' } as const;

export type FailBehavior = (typeof FAIL_BEHAVIOR)[keyof typeof FAIL_BEHAVIOR];

export interface BurstConfig {
  readonly burstPoints: RateLimitPoints;
}

export interface ProgressiveBlockingConfig {
  readonly enabled?: boolean;
  readonly initialBlockSeconds: Seconds;
  readonly maxBlockSeconds: Seconds;
  readonly multiplier: number;
  readonly violationTtlSeconds: Seconds;
}

interface BaseRateLimitConfig {
  readonly allowKeyOverride?: boolean;
  readonly allowManualAdjustments?: boolean;
  readonly concurrencyGroup?: string;
  readonly critical?: boolean;
  readonly enabled?: boolean;
  readonly errorCode?: string;
  readonly executionTimeoutMs?: DurationMilliseconds;
  readonly exposeInHeaders?: boolean;
  readonly failBehavior?: FailBehavior;
  readonly ignoreKeyOverride?: boolean;
  readonly keySegments?: ReadonlyList<RateLimitKeySegment>;
  readonly message?: string;
  readonly priority?: Priority;
}

interface QuotaBehaviorConfig {
  readonly degradedAllowancePerSecond?: RateLimitPoints;
}

export interface QuotaRateLimitConfig extends BaseRateLimitConfig, QuotaBehaviorConfig {
  readonly kind: typeof RATE_LIMIT_KIND.QUOTA;
  readonly algorithm?: QuotaAlgorithm;
  readonly blockDuration?: Seconds;
  readonly blockMultiplier?: number;
  readonly burst?: BurstConfig;
  readonly duration: Seconds;
  readonly points: RateLimitPoints;
  readonly progressiveBlocking?: ProgressiveBlockingConfig;
}

export interface CooldownRateLimitConfig extends BaseRateLimitConfig {
  readonly kind: typeof RATE_LIMIT_KIND.COOLDOWN;
  readonly duration: Seconds;

  readonly algorithm?: never;
  readonly allowManualAdjustments?: never;
  readonly blockDuration?: never;
  readonly blockMultiplier?: never;
  readonly burst?: never;
  readonly points?: never;
}

export type RateLimitConfig = QuotaRateLimitConfig | CooldownRateLimitConfig;

export interface RateLimitAdjustmentOptions {
  readonly key: string;

  readonly operationId?: string;
  readonly amount?: RateLimitPoints;
  readonly metadata?: ReadonlyRecord<string, JsonValue>;
  readonly reason?: string;
}

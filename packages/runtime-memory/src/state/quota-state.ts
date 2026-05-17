import type { ConsumedRateLimitPoints, UnixTimestampMs } from '@fluxguard/contracts';

export interface QuotaWindowState {
  readonly consumedPoints: ConsumedRateLimitPoints;

  readonly resetAt: UnixTimestampMs;
}

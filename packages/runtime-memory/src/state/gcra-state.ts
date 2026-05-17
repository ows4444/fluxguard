import type { MonotonicTimestampMs } from '@fluxguard/contracts';

export interface GcraState {
  readonly theoreticalArrivalTime: MonotonicTimestampMs;
}

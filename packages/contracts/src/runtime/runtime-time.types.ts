import type { MonotonicTimestampMs, UnixTimestampMs } from '../primitives';

export interface RuntimeTimeSnapshot {
  readonly monotonicNow: MonotonicTimestampMs;

  readonly wallClockNow: UnixTimestampMs;
}

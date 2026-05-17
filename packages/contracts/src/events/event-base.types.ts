import type { DurationMilliseconds, UnixTimestampMs } from '../primitives';

export interface TimestampedEvent {
  readonly timestamp: UnixTimestampMs;
}

export interface DurationEvent {
  readonly durationMs: DurationMilliseconds;
}

export interface IntervalEvent extends DurationEvent {
  readonly finishedAt: UnixTimestampMs;
  readonly startedAt: UnixTimestampMs;
}

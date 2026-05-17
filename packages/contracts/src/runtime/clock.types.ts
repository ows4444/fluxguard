import type { UnixTimestampMs } from '../primitives';

export interface Clock {
  now(): UnixTimestampMs;
}

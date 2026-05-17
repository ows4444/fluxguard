import type { DurationMilliseconds } from '../primitives';

export interface ShutdownOptions {
  readonly graceful?: boolean;

  readonly timeoutMs?: DurationMilliseconds;
}

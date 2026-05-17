import type { DurationMilliseconds } from '../primitives';

export interface RuntimeHealthStatus {
  readonly healthy: boolean;

  readonly degraded: boolean;

  readonly latencyMs?: DurationMilliseconds;

  readonly reason?: string;
}

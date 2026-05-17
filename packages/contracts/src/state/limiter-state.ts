import type { UnixTimestampMs } from '../primitives';

export interface LimiterRuntimeState {
  readonly reason?: string;
  readonly since: UnixTimestampMs;
  readonly state: LimiterState;
}

export const LIMITER_STATE = {
  ACTIVE: 'ACTIVE',
  DEGRADED: 'DEGRADED',
  OPEN: 'OPEN',
  DISABLED: 'DISABLED',
  MITIGATING: 'MITIGATING',
} as const;

export type LimiterState = (typeof LIMITER_STATE)[keyof typeof LIMITER_STATE];

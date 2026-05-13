export type LimiterState = 'ACTIVE' | 'DEGRADED' | 'OPEN' | 'DISABLED' | 'MITIGATING';

export interface LimiterRuntimeState {
  readonly state: LimiterState;
  readonly since: number;
  readonly reason?: string;
}

export type LimiterState = 'ACTIVE' | 'DEGRADED' | 'OPEN' | 'DISABLED' | 'MITIGATING';

export interface LimiterRuntimeState {
  readonly reason?: string;
  readonly since: number;
  readonly state: LimiterState;
}

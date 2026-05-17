import type { UnixTimestampMs } from '@fluxguard/contracts';

export interface CooldownState {
  readonly cooldownUntil: UnixTimestampMs;
}

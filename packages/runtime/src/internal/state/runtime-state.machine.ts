import type { LimiterRuntimeState, LimiterState } from '@fluxguard/contracts';

export interface RuntimeStateTransition {
  readonly from: LimiterState;

  readonly to: LimiterState;

  readonly reason: string;

  readonly timestamp: number;
}

export class RuntimeStateMachine {
  #state: LimiterRuntimeState = {
    state: 'ACTIVE',
    since: Date.now(),
  };

  get current(): LimiterRuntimeState {
    return this.#state;
  }

  transition(state: LimiterState, reason: string): RuntimeStateTransition | null {
    if (this.#state.state === state) {
      return null;
    }

    const previous = this.#state;

    const timestamp = Date.now();

    this.#state = {
      state,
      since: timestamp,
      reason,
    };

    return {
      from: previous.state,
      to: state,
      reason,
      timestamp,
    };
  }

  isActive(): boolean {
    return this.#state.state === 'ACTIVE';
  }

  isDegraded(): boolean {
    return this.#state.state === 'DEGRADED';
  }

  isOpen(): boolean {
    return this.#state.state === 'OPEN';
  }
}

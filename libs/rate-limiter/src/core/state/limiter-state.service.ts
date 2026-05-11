import { Injectable } from '@nestjs/common';

import { LimiterRuntimeState, LimiterState } from '../contracts/limiter-state';
import { optionalProp } from '../utils/object.utils';

@Injectable()
export class LimiterStateService {
  private readonly states = new Map<string, LimiterRuntimeState>();

  get(name: string): LimiterRuntimeState {
    return (
      this.states.get(name) ?? {
        state: 'ACTIVE',
        since: Date.now(),
      }
    );
  }

  transition(name: string, state: LimiterState, reason?: string): void {
    const current = this.states.get(name);

    if (current?.state === state && current.reason === reason) {
      return;
    }

    this.states.set(name, {
      state,
      since: Date.now(),

      ...optionalProp('reason', reason),
    });
  }
}

import { RuntimeLifecycleError } from '@fluxguard/runtime';

import { RUNTIME_STATE, type RuntimeState } from './runtime-state.types';

export function assertRuntimeActive(state: RuntimeState): void {
  if (state === RUNTIME_STATE.ACTIVE) {
    return;
  }

  if (state === RUNTIME_STATE.SHUTTING_DOWN) {
    throw new RuntimeLifecycleError('Runtime is shutting down');
  }

  throw new RuntimeLifecycleError('Runtime has been shut down');
}

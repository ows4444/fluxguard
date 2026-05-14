import { RuntimeExecutionAbortedError } from './runtime-aborted.error';

export function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new RuntimeExecutionAbortedError();
  }
}

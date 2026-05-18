import type { DurationMilliseconds } from '@fluxguard/contracts';

import { RuntimeTimeoutError } from '../errors/runtime-timeout.error';

function createTimeoutSignal(
  operation: string,
  timeoutMs: DurationMilliseconds,
): {
  readonly signal: AbortSignal;
  cleanup(): void;
} {
  const controller = new AbortController();

  const timer = setTimeout(() => {
    controller.abort(new RuntimeTimeoutError(operation, timeoutMs));
  }, timeoutMs);

  timer.unref?.();

  return {
    signal: controller.signal,
    cleanup() {
      clearTimeout(timer);
    },
  };
}

/**
 * Bounds the maximum wait time for an operation.
 *
 * IMPORTANT:
 * - timeout does NOT guarantee underlying execution cancellation
 * - callers MUST assume the operation may still complete in background
 * - intended for latency protection, not transactional interruption
 *
 * Future runtimes MAY implement cooperative cancellation explicitly.
 */
export async function withTimeout<T>(
  operation: string,
  execute: (signal: AbortSignal) => Promise<T>,
  timeoutMs?: DurationMilliseconds,
): Promise<T> {
  if (timeoutMs === undefined) {
    return execute(new AbortController().signal);
  }

  const timeout = createTimeoutSignal(operation, timeoutMs);

  try {
    return await Promise.race([
      execute(timeout.signal),
      new Promise<T>((_, reject) => {
        timeout.signal.addEventListener('abort', () => reject(timeout.signal.reason), { once: true });
      }),
    ]);
  } finally {
    timeout.cleanup();
  }
}

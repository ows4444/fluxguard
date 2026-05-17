import type { DurationMilliseconds } from '@fluxguard/contracts';

import { RuntimeTimeoutError } from '../errors/runtime-timeout.error';

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
  execute: () => Promise<T>,
  timeoutMs?: DurationMilliseconds,
): Promise<T> {
  if (timeoutMs === undefined) {
    return execute();
  }

  let timer: NodeJS.Timeout | undefined;

  const timeoutPromise = new Promise<T>((_, reject) => {
    timer = setTimeout(() => {
      reject(new RuntimeTimeoutError(operation, timeoutMs));
    }, timeoutMs);

    timer.unref?.();
  });

  try {
    return await Promise.race([execute(), timeoutPromise]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

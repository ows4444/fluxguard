import type { DurationMilliseconds } from '@fluxguard/contracts';

import { RuntimeTimeoutError } from '../errors/runtime-timeout.error';

export async function withTimeout<T>(
  operation: string,
  execute: (signal: AbortSignal) => Promise<T>,
  timeoutMs?: DurationMilliseconds,
): Promise<T> {
  if (timeoutMs === undefined) {
    return execute(new AbortController().signal);
  }
  const controller = new AbortController();

  let timer: NodeJS.Timeout | undefined;

  const timeoutPromise = new Promise<T>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new RuntimeTimeoutError(operation, timeoutMs));
    }, timeoutMs);

    timer.unref?.();
  });

  try {
    return await Promise.race([execute(controller.signal), timeoutPromise]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

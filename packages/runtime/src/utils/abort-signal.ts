export function composeAbortSignals(signals: readonly AbortSignal[]): {
  readonly signal: AbortSignal;
  cleanup(): void;
} {
  const controller = new AbortController();
  const cleanups: Array<() => void> = [];

  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort(signal.reason);

      return {
        signal: controller.signal,
        cleanup() {
          for (const c of cleanups) {
            c();
          }
        },
      };
    }

    const listener = () => controller.abort(signal.reason);

    signal.addEventListener('abort', listener, { once: true });

    cleanups.push(() => {
      signal.removeEventListener('abort', listener);
    });
  }

  controller.signal.addEventListener(
    'abort',
    () => {
      for (const cleanup of cleanups) {
        cleanup();
      }
    },
    { once: true },
  );

  return {
    signal: controller.signal,
    cleanup() {
      for (const cleanup of cleanups) {
        cleanup();
      }
    },
  };
}

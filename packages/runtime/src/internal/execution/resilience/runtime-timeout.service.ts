export class RuntimeTimeoutError extends Error {
  override readonly name = 'RuntimeTimeoutError';

  constructor(timeoutMs: number) {
    super(`Runtime execution timed out after ${timeoutMs}ms`);
  }
}

export class RuntimeTimeoutService {
  async execute<T>(operationFactory: () => Promise<T>, timeoutMs: number): Promise<T> {
    let timeout: NodeJS.Timeout | undefined;

    try {
      return await Promise.race([
        operationFactory(),

        new Promise<T>((_, reject) => {
          timeout = setTimeout(() => {
            reject(new RuntimeTimeoutError(timeoutMs));
          }, timeoutMs);

          timeout.unref?.();
        }),
      ]);
    } finally {
      if (timeout) {
        clearTimeout(timeout);
      }
    }
  }
}

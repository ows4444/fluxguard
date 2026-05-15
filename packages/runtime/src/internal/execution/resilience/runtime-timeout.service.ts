export class RuntimeTimeoutError extends Error {
  override readonly name = 'RuntimeTimeoutError';

  constructor(timeoutMs: number) {
    super(`Runtime execution timed out after ${timeoutMs}ms`);
  }
}

export class RuntimeOverloadError extends Error {
  override readonly name = 'RuntimeOverloadError';

  constructor(limit: number) {
    super(`Runtime timeout service overloaded (limit: ${limit})`);
  }
}

export interface RuntimeTimeoutExecutionContext {
  readonly signal: AbortSignal;

  readonly timedOut: () => boolean;
}

export class RuntimeTimeoutService {
  static readonly MAX_ACTIVE_OPERATIONS = 10_000;

  #activeOperations = 0;

  async execute<T>(
    operationFactory: (context: RuntimeTimeoutExecutionContext) => Promise<T>,
    timeoutMs: number,
  ): Promise<T> {
    if (this.#activeOperations >= RuntimeTimeoutService.MAX_ACTIVE_OPERATIONS) {
      throw new RuntimeOverloadError(RuntimeTimeoutService.MAX_ACTIVE_OPERATIONS);
    }

    this.#activeOperations += 1;

    const controller = new AbortController();

    let timeout: NodeJS.Timeout | undefined;

    let settled = false;

    let timedOut = false;

    const finalize = (): void => {
      if (settled) {
        return;
      }

      settled = true;

      this.#activeOperations -= 1;

      if (timeout) {
        clearTimeout(timeout);

        timeout = undefined;
      }
      controller.signal.onabort = null;
    };

    return await new Promise<T>((resolve, reject) => {
      timeout = setTimeout(() => {
        if (settled) {
          return;
        }

        timedOut = true;

        const timeoutError = new RuntimeTimeoutError(timeoutMs);

        if (!controller.signal.aborted) {
          controller.abort(timeoutError);
        }

        finalize();

        reject(timeoutError);
      }, timeoutMs);

      timeout.unref?.();

      void operationFactory({
        signal: controller.signal,

        timedOut: () => timedOut,
      })
        .then((result) => {
          if (settled) {
            return;
          }

          finalize();

          resolve(result);
        })
        .catch((error) => {
          if (settled) {
            return;
          }

          if (controller.signal.aborted && controller.signal.reason instanceof Error) {
            finalize();

            reject(controller.signal.reason);

            return;
          }

          finalize();

          reject(error);
        });
    });
  }
}

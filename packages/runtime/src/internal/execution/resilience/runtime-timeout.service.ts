export class RuntimeTimeoutError extends Error {
  override readonly name = 'RuntimeTimeoutError';

  constructor(timeoutMs: number) {
    super(`Runtime execution timed out after ${timeoutMs}ms`);
  }
}

export interface RuntimeTimeoutExecutionContext {
  readonly signal: AbortSignal;

  readonly timedOut: () => boolean;
}

export class RuntimeTimeoutService {
  async execute<T>(
    operationFactory: (context: RuntimeTimeoutExecutionContext) => Promise<T>,
    timeoutMs: number,
  ): Promise<T> {
    const controller = new AbortController();

    let timeout: NodeJS.Timeout | undefined;

    let settled = false;

    let timedOut = false;

    const finalize = (): void => {
      settled = true;

      if (timeout) {
        clearTimeout(timeout);

        timeout = undefined;
      }
    };

    return await new Promise<T>((resolve, reject) => {
      timeout = setTimeout(() => {
        if (settled) {
          return;
        }

        timedOut = true;

        const timeoutError = new RuntimeTimeoutError(timeoutMs);

        controller.abort(timeoutError);

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

import { ShadowTimeoutExceededError } from './shadow-timeout.error';

export interface ShadowEvaluationBudget {
  readonly timeoutMs: number;
}

export const DEFAULT_SHADOW_EVALUATION_BUDGET: ShadowEvaluationBudget = Object.freeze({
  timeoutMs: 1000,
});

export async function withTimeout<T>(operation: (signal: AbortSignal) => Promise<T>, timeoutMs: number): Promise<T> {
  const controller = new AbortController();
  let timer: NodeJS.Timeout | undefined;

  try {
    return await Promise.race([
      operation(controller.signal),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          controller.abort();
          reject(new ShadowTimeoutExceededError(timeoutMs));
        }, timeoutMs);

        timer.unref?.();
      }),
    ]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

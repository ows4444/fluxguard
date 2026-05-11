import { Injectable } from '@nestjs/common';

interface ExecutionContext {
  readonly signal: AbortSignal;
}

interface Task<T> {
  readonly key: string;
  readonly timeoutMs: number;
  readonly execute: (ctx: ExecutionContext) => Promise<T>;
}

interface TaskResult<T> {
  readonly key: string;
  readonly value?: T;
  readonly error?: unknown;
}

@Injectable()
export class ParallelEvaluatorService {
  private readonly maxConcurrency = Number(process.env.RATE_LIMITER_PARALLELISM ?? 8);

  async evaluate<T>(tasks: readonly Task<T>[]): Promise<TaskResult<T>[]> {
    const results: TaskResult<T>[] = Array.from({ length: tasks.length }, (): TaskResult<T> => ({ key: '' }));

    let cursor = 0;
    const workers = Array.from(
      {
        length: Math.min(this.maxConcurrency, tasks.length),
      },
      async () => {
        while (true) {
          const idx = cursor++;
          if (idx >= tasks.length) {
            return;
          }
          const task = tasks[idx];
          if (!task) {
            continue;
          }
          try {
            const value = await this.executeWithTimeout(task.execute, task.timeoutMs);
            results[idx] = {
              key: task.key,
              value,
            };
          } catch (error) {
            results[idx] = {
              key: task.key,
              error,
            };
          }
        }
      },
    );
    await Promise.all(workers);
    return results;
  }

  private async executeWithTimeout<T>(fn: (ctx: { signal: AbortSignal }) => Promise<T>, timeoutMs: number): Promise<T> {
    const controller = new AbortController();

    let timer: NodeJS.Timeout | undefined;

    try {
      timer = setTimeout(() => {
        controller.abort(new Error(`parallel_evaluation_timeout:${timeoutMs}`));
      }, timeoutMs);

      timer.unref?.();

      return await fn({ signal: controller.signal });
    } finally {
      if (timer) {
        clearTimeout(timer);
      }
    }
  }
}

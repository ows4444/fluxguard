import { Injectable, Logger } from '@nestjs/common';

import { RateLimiterInfrastructureError } from '../errors/rate-limiter.errors';
import { MonotonicClockService } from '../core/time/monotonic.time';
import { RedisErrorClassifier } from './redis-error-classifier';
import { optionalProp } from '../core/utils/object.utils';

interface QueuedOperation {
  operation: string;

  fn: () => Promise<unknown>;

  signal?: AbortSignal;

  enqueuedAt: number;

  deadlineAt: number;

  resolve: (value: unknown) => void;

  reject: (reason?: unknown) => void;
}

interface ExecutorPoolState {
  readonly queue: (QueuedOperation | undefined)[];

  queueHead: number;

  queueTail: number;

  activeCount: number;

  rejectedExecutions: number;

  timedOutExecutions: number;

  shedExecutions: number;

  overloadSince?: number;
}

@Injectable()
export class RedisExecutor {
  constructor(private readonly clock: MonotonicClockService) {
    setInterval(() => {
      this.reportHealth();
    }, 10000).unref?.();
  }
  private readonly logger = new Logger(RedisExecutor.name);

  private readonly timeoutMs = Number(process.env.RATE_LIMITER_REDIS_TIMEOUT_MS ?? 150);

  private readonly maxConcurrent = Number(process.env.RATE_LIMITER_REDIS_MAX_CONCURRENT ?? 256);

  private readonly maxQueueSize = Number(process.env.RATE_LIMITER_REDIS_MAX_QUEUE ?? 1024);

  private readonly queueTimeoutMs = Number(process.env.RATE_LIMITER_REDIS_QUEUE_TIMEOUT_MS ?? 25);

  private readonly latencyWarningMs = Number(process.env.RATE_LIMITER_REDIS_WARN_MS ?? 50);

  private readonly overloadThreshold = Number(process.env.RATE_LIMITER_REDIS_OVERLOAD_THRESHOLD ?? 0.85);

  private readonly pools = new Map<string, ExecutorPoolState>();

  private readonly overloadCooldownMs = 5000;

  async execute<T>(group: string, operation: string, fn: () => Promise<T>, signal?: AbortSignal): Promise<T> {
    if (signal?.aborted) {
      throw signal.reason ?? new Error('operation_aborted');
    }

    const pool = this.getPool(group);

    if (this.shouldShedLoad(pool)) {
      pool.shedExecutions += 1;

      throw new RateLimiterInfrastructureError(
        ['Redis executor overloaded', `operation=${operation}`, 'shed=true'].join(' '),
      );
    }

    if (pool.activeCount < this.maxConcurrent) {
      return await this.executeNow(pool, {
        operation,
        fn,
        enqueuedAt: this.clock.nowMs(),
      });
    }

    if (pool.queueTail - pool.queueHead >= this.maxQueueSize) {
      pool.rejectedExecutions += 1;
      throw new RateLimiterInfrastructureError(
        [
          'Redis executor overloaded',
          `operation=${String(operation)}`,
          `queue=${pool.queueTail - pool.queueHead}`,
          `maxQueue=${this.maxQueueSize}`,
        ].join(' '),
      );
    }

    return new Promise<T>((resolve, reject) => {
      pool.queue[pool.queueTail % this.maxQueueSize] = {
        operation,

        fn: fn as () => Promise<unknown>,

        ...optionalProp('signal', signal),

        enqueuedAt: this.clock.nowMs(),

        deadlineAt: this.clock.nowMs() + this.queueTimeoutMs,

        resolve: resolve as (value: unknown) => void,

        reject,
      };

      pool.queueTail += 1;
    });
  }

  private drainQueue(pool: ExecutorPoolState): void {
    while (pool.activeCount < this.maxConcurrent && pool.queueHead < pool.queueTail) {
      const idx = pool.queueHead % this.maxQueueSize;

      const item = pool.queue[idx];

      if (item?.signal?.aborted) {
        pool.queue[idx] = undefined;

        pool.queueHead += 1;

        const reason = item.signal.reason instanceof Error ? item.signal.reason : new Error('queued_operation_aborted');

        item.reject(reason);

        continue;
      }

      if (!item) {
        pool.queueHead += 1;
        continue;
      }

      pool.queue[idx] = undefined;

      pool.queueHead += 1;

      const now = this.clock.nowMs();

      if (now >= item.deadlineAt) {
        const queueWaitMs = now - item.enqueuedAt;

        item.reject(
          new RateLimiterInfrastructureError(
            ['Redis queue timeout', `operation=${item.operation}`, `queueWaitMs=${queueWaitMs}`].join(' '),
          ),
        );

        continue;
      }

      void this.executeNow(pool, item).then(item.resolve).catch(item.reject);
    }

    this.normalizeQueueCounters(pool);
  }

  private async executeNow<T>(
    pool: ExecutorPoolState,
    item: {
      operation: string;

      fn: () => Promise<T>;

      signal?: AbortSignal;

      enqueuedAt: number;
    },
  ): Promise<T> {
    pool.activeCount += 1;

    const startedAt = performance.now();

    let settled = false;

    let timeoutId: NodeJS.Timeout | undefined;

    try {
      return await new Promise<T>((resolve, reject) => {
        const finalize = (fn: () => void): void => {
          if (settled) {
            return;
          }

          settled = true;
          fn();
        };

        const abortHandler = () => {
          finalize(() => {
            reject(item.signal?.reason instanceof Error ? item.signal.reason : new Error('redis_operation_aborted'));
          });
        };

        item.signal?.addEventListener('abort', abortHandler, {
          once: true,
        });

        item
          .fn()
          .then((value) => {
            finalize(() => {
              item.signal?.removeEventListener('abort', abortHandler);
              resolve(value);
            });
          })
          .catch((err: Error) => {
            finalize(() => {
              item.signal?.removeEventListener('abort', abortHandler);
              reject(err);
            });
          });

        timeoutId = setTimeout(() => {
          pool.timedOutExecutions += 1;

          finalize(() => {
            reject(
              new RateLimiterInfrastructureError(
                ['Redis operation timeout', `operation=${item.operation}`, `timeoutMs=${this.timeoutMs}`].join(' '),
              ),
            );
          });
        }, this.timeoutMs);
        timeoutId.unref?.();
      });
    } catch (err) {
      throw this.normalizeError(item.operation, err);
    } finally {
      pool.activeCount -= 1;

      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      this.drainQueue(pool);

      const duration = performance.now() - startedAt;

      if (duration >= this.latencyWarningMs) {
        this.logger.warn(
          ['Slow Redis operation', `operation=${item.operation}`, `durationMs=${duration.toFixed(1)}`].join(' '),
        );
      }
    }
  }

  private normalizeError(operation: string, err: unknown): RateLimiterInfrastructureError {
    if (err instanceof RateLimiterInfrastructureError) {
      return err;
    }

    const classified = RedisErrorClassifier.classify(err);

    this.logger.error(
      JSON.stringify({
        event: 'redis_operation_failed',
        operation,
        type: classified.type,
        retryable: classified.retryable,
        topologyRelated: classified.topologyRelated,
        errorClass: this.errorName(err),
      }),
    );

    return new RateLimiterInfrastructureError(
      ['Redis execution failed', `operation=${operation}`, `type=${classified.type}`].join(' '),
      err,
    );
  }

  private shouldShedLoad(pool: ExecutorPoolState): boolean {
    const utilization =
      (pool.activeCount + (pool.queueTail - pool.queueHead)) / (this.maxConcurrent + this.maxQueueSize);

    if (utilization >= this.overloadThreshold) {
      if (!pool.overloadSince) {
        pool.overloadSince = this.clock.nowMs();
      }

      return this.clock.nowMs() - pool.overloadSince >= 250;
    }

    if (pool.overloadSince && this.clock.nowMs() - pool.overloadSince > this.overloadCooldownMs) {
      pool.overloadSince = undefined;
    }

    return false;
  }

  private errorName(err: unknown): string {
    if (!(err instanceof Error)) {
      return 'UnknownError';
    }

    return err.name || 'Error';
  }

  private reportHealth(): void {
    for (const [group, pool] of this.pools.entries()) {
      const queued = pool.queueTail - pool.queueHead;

      if (
        queued === 0 &&
        pool.activeCount === 0 &&
        pool.timedOutExecutions === 0 &&
        pool.shedExecutions === 0 &&
        pool.rejectedExecutions === 0
      ) {
        continue;
      }

      this.logger.warn(
        JSON.stringify({
          event: 'rate_limiter_redis_executor_health',
          group,
          active: pool.activeCount,
          queued,
          maxConcurrent: this.maxConcurrent,
          maxQueue: this.maxQueueSize,
          timedOut: pool.timedOutExecutions,
          shed: pool.shedExecutions,
          rejected: pool.rejectedExecutions,
        }),
      );
    }
  }

  private normalizeQueueCounters(pool: ExecutorPoolState): void {
    if (pool.queueHead === pool.queueTail) {
      pool.queueHead = 0;
      pool.queueTail = 0;
    }

    pool.queueTail -= pool.queueHead;

    pool.queueHead = 0;
  }

  private getPool(group = 'default'): ExecutorPoolState {
    let pool = this.pools.get(group);

    if (!pool) {
      pool = {
        queue: Array.from({ length: this.maxQueueSize }, (): undefined => undefined),

        queueHead: 0,

        queueTail: 0,

        activeCount: 0,

        rejectedExecutions: 0,

        timedOutExecutions: 0,

        shedExecutions: 0,
      };

      this.pools.set(group, pool);
    }

    return pool;
  }
}

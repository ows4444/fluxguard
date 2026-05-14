import {
  RuntimeConcurrencyManagerDestroyedError,
  RuntimeConcurrencyQueueFullError,
  RuntimeConcurrencyTimeoutError,
} from './runtime-concurrency.errors';

export interface RuntimeConcurrencyTaskContext {
  readonly signal?: AbortSignal;
}

export interface RuntimeConcurrencyTask<T> {
  (context: RuntimeConcurrencyTaskContext): Promise<T>;
}

interface ComposedSignal {
  readonly signal: AbortSignal;

  readonly cleanup: () => void;
}

interface PendingEntry {
  id: number;

  createdAt: number;

  resolve: () => void;

  reject: (error: Error) => void;

  timeout?: NodeJS.Timeout;
}

interface QueueEntry {
  active: boolean;

  ownerId?: number;

  pending: Map<number, PendingEntry>;

  order: number[];

  head: number;
}

export class RuntimeConcurrencyManager {
  static readonly MAX_PENDING_PER_GROUP = 1_000;

  static readonly WAIT_TIMEOUT_MS = 5_000;

  static readonly MAX_QUEUE_DRAIN = 1024;

  readonly #groups = new Map<string, QueueEntry>();

  readonly #shutdown = new AbortController();

  #destroyed = false;

  #nextPendingId = 0;

  async execute<T>(group: string, task: RuntimeConcurrencyTask<T>, signal?: AbortSignal): Promise<T> {
    if (this.#destroyed) {
      throw new RuntimeConcurrencyManagerDestroyedError();
    }

    const composed = this.composeSignal(signal);

    composed.signal.throwIfAborted?.();

    const queue = this.#groups.get(group) ?? {
      active: false,
      ownerId: undefined,
      pending: new Map(),
      order: [],
      head: 0,
    };

    this.#groups.set(group, queue);

    if (queue.active) {
      await this.waitForTurn(group, queue, composed.signal);
    }
    queue.ownerId ??= 0;

    queue.active = true;

    try {
      return await task({ signal: composed.signal });
    } finally {
      composed.cleanup();
      const transferred = this.releaseNext(queue);

      if (!transferred) {
        queue.active = false;
        queue.ownerId = undefined;
      }

      this.cleanupGroup(group, queue);
    }
  }

  private async waitForTurn(group: string, queue: QueueEntry, signal?: AbortSignal): Promise<number> {
    if (queue.pending.size >= RuntimeConcurrencyManager.MAX_PENDING_PER_GROUP) {
      throw new RuntimeConcurrencyQueueFullError(group, RuntimeConcurrencyManager.MAX_PENDING_PER_GROUP);
    }

    const id = ++this.#nextPendingId;

    return await new Promise<number>((resolve, reject) => {
      let settled = false;

      const finalize = (callback: () => void): void => {
        if (settled) {
          return;
        }

        settled = true;

        if (pending.timeout) {
          clearTimeout(pending.timeout);
        }

        if (signal && abortHandler) {
          signal.removeEventListener('abort', abortHandler);
        }

        queue.pending.delete(id);

        callback();
      };

      const pending: PendingEntry = {
        id,

        createdAt: Date.now(),

        resolve: () => {
          queue.ownerId = id;

          finalize(() => resolve(id));
        },

        reject: (error) => {
          finalize(() => reject(error));
        },
      };

      const abortHandler = signal
        ? () => {
            pending.reject(signal.reason ?? new Error('Operation aborted'));
          }
        : undefined;

      if (signal && abortHandler) {
        signal.addEventListener('abort', abortHandler, {
          once: true,
        });
      }

      pending.timeout = setTimeout(() => {
        pending.reject(new RuntimeConcurrencyTimeoutError(group, RuntimeConcurrencyManager.WAIT_TIMEOUT_MS));
      }, RuntimeConcurrencyManager.WAIT_TIMEOUT_MS);

      pending.timeout.unref?.();

      queue.pending.set(id, pending);

      queue.order.push(id);
    });
  }

  private releaseNext(queue: QueueEntry): boolean {
    let scanned = 0;

    while (queue.head < queue.order.length && scanned < RuntimeConcurrencyManager.MAX_QUEUE_DRAIN) {
      scanned += 1;

      const nextId = queue.order[queue.head];

      queue.head += 1;
      this.compactQueueOrder(queue);

      if (nextId === undefined) {
        return false;
      }

      const next = queue.pending.get(nextId);

      if (next) {
        queue.ownerId = next.id;
        next.resolve();

        return true;
      }
    }
    return false;
  }

  private compactQueueOrder(queue: QueueEntry): void {
    if (queue.head === 0) {
      return;
    }

    if (queue.head < 1024 && queue.head < queue.order.length / 2) {
      return;
    }

    queue.order = queue.order.slice(queue.head);

    queue.head = 0;
  }

  destroy(): void {
    if (this.#destroyed) {
      return;
    }

    this.#destroyed = true;

    this.#shutdown.abort(new RuntimeConcurrencyManagerDestroyedError());

    const error = new RuntimeConcurrencyManagerDestroyedError();

    for (const queue of this.#groups.values()) {
      for (const pending of queue.pending.values()) {
        pending.reject(error);
      }

      queue.pending.clear();
      queue.order.length = 0;
      queue.active = false;
    }

    this.#groups.clear();
  }

  private composeSignal(signal?: AbortSignal): ComposedSignal {
    if (!signal) {
      return {
        signal: this.#shutdown.signal,

        cleanup: () => {},
      };
    }

    if (signal.aborted) {
      return {
        signal,

        cleanup: () => {},
      };
    }

    const controller = new AbortController();

    const abort = (reason?: unknown): void => {
      controller.abort(reason);
    };

    const onSignalAbort = (): void => {
      abort(signal.reason);
    };

    const onShutdownAbort = (): void => {
      abort(this.#shutdown.signal.reason);
    };

    signal.addEventListener('abort', onSignalAbort, {
      once: true,
    });

    this.#shutdown.signal.addEventListener('abort', onShutdownAbort, {
      once: true,
    });

    return {
      signal: controller.signal,

      cleanup: () => {
        signal.removeEventListener('abort', onSignalAbort);

        this.#shutdown.signal.removeEventListener('abort', onShutdownAbort);
      },
    };
  }

  private cleanupGroup(group: string, queue: QueueEntry): void {
    if (!queue.active && queue.pending.size === 0 && queue.head >= queue.order.length) {
      this.#groups.delete(group);
    }
  }
}

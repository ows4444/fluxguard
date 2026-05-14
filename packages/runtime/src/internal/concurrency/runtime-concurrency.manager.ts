export interface RuntimeConcurrencyTask<T> {
  (): Promise<T>;
}

interface QueueEntry {
  active: boolean;
  pending: Array<{
    createdAt: number;
    resolve: () => void;
  }>;
}

export class RuntimeConcurrencyManager {
  readonly #groups = new Map<string, QueueEntry>();

  async execute<T>(group: string, task: RuntimeConcurrencyTask<T>): Promise<T> {
    const queue = this.#groups.get(group) ?? {
      active: false,
      pending: [],
    };

    this.#groups.set(group, queue);

    while (queue.active) {
      await new Promise<void>((resolve) => {
        queue.pending.push({
          createdAt: Date.now(),
          resolve,
        });
      });
    }

    queue.active = true;

    try {
      return await task();
    } finally {
      queue.active = false;

      const next = queue.pending.shift();

      if (next) {
        next.resolve();
      }

      if (!queue.active && queue.pending.length === 0) {
        this.#groups.delete(group);
      }
    }
  }
}

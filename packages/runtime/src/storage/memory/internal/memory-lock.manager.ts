interface LockEntry {
  promise: Promise<void>;
}

export class MemoryLockManager {
  static readonly MAX_LOCKS = 50_000;

  readonly #locks = new Map<string, LockEntry>();

  async execute<T>(key: string, operation: () => Promise<T>): Promise<T> {
    this.cleanupExpired();

    const previous = this.#locks.get(key)?.promise ?? Promise.resolve();

    let release!: () => void;

    const current = new Promise<void>((resolve) => {
      release = resolve;
    });

    this.#locks.set(key, {
      promise: current,
    });

    await previous;

    try {
      return await operation();
    } finally {
      release();

      const currentEntry = this.#locks.get(key);

      if (currentEntry?.promise === current) {
        this.#locks.delete(key);
      }
    }
  }

  private cleanupExpired(): void {
    if (this.#locks.size >= MemoryLockManager.MAX_LOCKS) {
      throw new Error(`MemoryLockManager capacity exceeded (${MemoryLockManager.MAX_LOCKS})`);
    }
  }
}

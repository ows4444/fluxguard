export class MemoryLockManager {
  readonly #locks = new Map<string, Promise<void>>();

  async execute<T>(key: string, operation: () => Promise<T>): Promise<T> {
    const previous = this.#locks.get(key) ?? Promise.resolve();

    let release!: () => void;

    const current = new Promise<void>((resolve) => {
      release = resolve;
    });

    const chained = previous.then(() => current);

    this.#locks.set(key, chained);

    await previous;

    try {
      return await operation();
    } finally {
      release();

      chained.finally(() => {
        if (this.#locks.get(key) === chained) {
          this.#locks.delete(key);
        }
      });
    }
  }
}

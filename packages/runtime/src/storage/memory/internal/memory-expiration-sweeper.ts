export class MemoryExpirationSweeper<T> {
  readonly #store: Map<string, { expiresAt: number; value: T }>;

  readonly #timer: NodeJS.Timeout;

  constructor(store: Map<string, { expiresAt: number; value: T }>, intervalMs = 30_000, maxSweep = 1000) {
    this.#store = store;

    this.#timer = setInterval(() => {
      const now = Date.now();

      let scanned = 0;

      for (const [key, value] of this.#store.entries()) {
        if (value.expiresAt <= now) {
          this.#store.delete(key);
        }

        scanned += 1;

        if (scanned >= maxSweep) {
          break;
        }
      }
    }, intervalMs);

    this.#timer.unref?.();
  }

  destroy(): void {
    clearInterval(this.#timer);
  }
}

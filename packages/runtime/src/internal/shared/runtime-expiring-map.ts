export interface RuntimeExpiringMapEntry<T> {
  readonly value: T;

  readonly expiresAt: number;
}

export interface RuntimeExpiringMapOptions {
  readonly maxSize: number;

  readonly cleanupIntervalMs?: number;

  readonly maxCleanupPerSweep?: number;
}

export class RuntimeExpiringMap<T> {
  static readonly MAX_CLEANUP_PER_WRITE = 32;

  static readonly DEFAULT_CLEANUP_INTERVAL_MS = 30_000;

  static readonly DEFAULT_MAX_CLEANUP_PER_SWEEP = 512;

  readonly #entries = new Map<string, RuntimeExpiringMapEntry<T>>();

  readonly #maxSize: number;

  readonly #maxCleanupPerSweep: number;

  readonly #cleanupIntervalMs: number;

  readonly #cleanupTimer?: NodeJS.Timeout;

  #destroyed = false;

  constructor(options: RuntimeExpiringMapOptions) {
    this.#maxSize = options.maxSize;

    this.#cleanupIntervalMs = options.cleanupIntervalMs ?? RuntimeExpiringMap.DEFAULT_CLEANUP_INTERVAL_MS;

    this.#maxCleanupPerSweep = options.maxCleanupPerSweep ?? RuntimeExpiringMap.DEFAULT_MAX_CLEANUP_PER_SWEEP;

    this.#cleanupTimer = setInterval(() => {
      this.evictExpired(this.#maxCleanupPerSweep);
    }, this.#cleanupIntervalMs);

    this.#cleanupTimer.unref?.();
  }

  get(key: string): T | undefined {
    if (this.#destroyed) {
      return undefined;
    }

    const existing = this.#entries.get(key);

    if (!existing) {
      return undefined;
    }

    if (existing.expiresAt <= Date.now()) {
      this.#entries.delete(key);

      return undefined;
    }

    return existing.value;
  }

  set(key: string, value: T, expiresAt: number): void {
    if (this.#destroyed) {
      return;
    }

    this.evictExpired(RuntimeExpiringMap.MAX_CLEANUP_PER_WRITE);

    if (this.#entries.size >= this.#maxSize) {
      this.evictOldest();
    }

    this.#entries.set(key, {
      value,
      expiresAt,
    });
  }

  delete(key: string): void {
    this.#entries.delete(key);
  }

  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  size(): number {
    return this.#entries.size;
  }

  entries(): IterableIterator<[string, RuntimeExpiringMapEntry<T>]> {
    return this.#entries.entries();
  }

  destroy(): void {
    if (this.#destroyed) {
      return;
    }

    this.#destroyed = true;

    if (this.#cleanupTimer) {
      clearInterval(this.#cleanupTimer);
    }

    this.#entries.clear();
  }

  private evictExpired(limit: number): void {
    if (this.#entries.size === 0) {
      return;
    }

    const now = Date.now();

    let cleaned = 0;

    for (const [key, value] of this.#entries.entries()) {
      if (value.expiresAt <= now) {
        this.#entries.delete(key);

        cleaned += 1;

        if (cleaned >= limit) {
          return;
        }
      }
    }
  }

  private evictOldest(): void {
    this.evictExpired(this.#maxCleanupPerSweep);

    const oldest = this.#entries.keys().next();

    if (!oldest.done) {
      this.#entries.delete(oldest.value);
    }
  }
}

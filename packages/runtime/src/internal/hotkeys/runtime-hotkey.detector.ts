interface HotKeyEntry {
  hits: number;

  expiresAt: number;

  suppressedUntil: number;
}

export interface RuntimeHotKeyDetectorOptions {
  readonly threshold: number;

  readonly windowMs: number;

  readonly suppressionMs: number;
}

export class RuntimeHotKeyDetector {
  static readonly CLEANUP_INTERVAL = 1000;
  static readonly ENTRY_TTL_MS = 60_000;

  readonly #threshold: number;

  readonly #windowMs: number;

  readonly #suppressionMs: number;

  readonly #entries = new Map<string, HotKeyEntry>();

  #operations = 0;

  constructor(options: RuntimeHotKeyDetectorOptions) {
    this.#threshold = options.threshold;

    this.#windowMs = options.windowMs;

    this.#suppressionMs = options.suppressionMs;
  }

  register(key: string): void {
    this.cleanupExpiredEntries();
    const now = Date.now();

    const existing = this.#entries.get(key);

    if (existing && existing.suppressedUntil > now) {
      return;
    }

    if (!existing || existing.expiresAt <= now) {
      this.#entries.set(key, {
        hits: 1,
        expiresAt: Math.max(now + this.#windowMs, now + RuntimeHotKeyDetector.ENTRY_TTL_MS),
        suppressedUntil: 0,
      });

      return;
    }

    existing.hits += 1;

    existing.expiresAt = Math.max(existing.expiresAt, now + RuntimeHotKeyDetector.ENTRY_TTL_MS);

    if (existing.hits >= this.#threshold) {
      existing.suppressedUntil = now + this.#suppressionMs;

      return;
    }

    return;
  }

  private cleanupExpiredEntries(): void {
    this.#operations += 1;

    if (this.#operations % RuntimeHotKeyDetector.CLEANUP_INTERVAL !== 0) {
      return;
    }

    const now = Date.now();

    for (const [key, entry] of this.#entries.entries()) {
      if (entry.expiresAt <= now && entry.suppressedUntil <= now) {
        this.#entries.delete(key);
      }
    }
  }
}

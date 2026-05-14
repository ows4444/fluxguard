import { RuntimeExpiringMap } from '../shared/runtime-expiring-map';

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

  readonly #entries = new RuntimeExpiringMap<HotKeyEntry>({
    maxSize: 100_000,
  });

  constructor(options: RuntimeHotKeyDetectorOptions) {
    this.#threshold = options.threshold;

    this.#windowMs = options.windowMs;

    this.#suppressionMs = options.suppressionMs;
  }

  register(key: string): void {
    const now = Date.now();

    const existing = this.#entries.get(key);

    if (existing && existing.suppressedUntil > now) {
      return;
    }

    if (!existing || existing.expiresAt <= now) {
      const expiresAt = Math.max(now + this.#windowMs, now + RuntimeHotKeyDetector.ENTRY_TTL_MS);

      this.#entries.set(
        key,
        {
          hits: 1,
          expiresAt,
          suppressedUntil: 0,
        },
        expiresAt,
      );

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
}

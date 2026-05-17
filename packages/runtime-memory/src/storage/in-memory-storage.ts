import { type Clock, RateLimiterInfrastructureError, type UnixTimestampMs } from '@fluxguard/contracts';

import type { RuntimeStorage, StorageEntry, StorageUpdateResult } from './runtime-storage';

const DEFAULT_SWEEP_INTERVAL = 1000;

export interface InMemoryStorageOptions {
  readonly maxEntries?: number;
}

const DEFAULT_SWEEP_BATCH_SIZE = 100;
const DEFAULT_SWEEP_FREQUENCY_MS = 1000;

/**
 * In-memory runtime storage intended for:
 * - tests
 * - development
 * - single-process deployments
 *
 * Not suitable for:
 * - high-cardinality workloads
 * - unbounded tenant growth
 * - distributed production systems
 *
 * Expiration sweeping is opportunistic
 * and O(n) relative to stored key count.
 */
export class InMemoryStorage<TState> implements RuntimeStorage<TState> {
  private readonly storage = new Map<string, StorageEntry<TState>>();

  private sweepIterator?: IterableIterator<[string, StorageEntry<TState>]>;

  private writeCount = 0;

  private lastSweepAt = 0;

  constructor(
    private readonly clock: Clock,
    private readonly options: InMemoryStorageOptions = {},
  ) {}

  get(key: string): TState | undefined {
    this.maybeSweep();
    return this.readActiveEntry(key)?.value;
  }

  set(key: string, value: TState, expiresAt?: UnixTimestampMs): void {
    this.maybeSweep();

    this.storage.set(key, {
      value,
      ...(expiresAt !== undefined ? { expiresAt } : {}),
    });

    this.onWrite();
  }

  delete(key: string): void {
    this.storage.delete(key);
  }
  update<TResult>(
    key: string,
    updater: (current: TState | undefined) => StorageUpdateResult<TState, TResult>,
  ): TResult {
    this.maybeSweep();
    const current = this.readActiveEntry(key)?.value;

    const next = updater(current);

    if (next.value === undefined) {
      this.storage.delete(key);
    } else {
      this.assertCapacityFor(key);
      this.storage.set(key, {
        value: next.value,
        ...(next.expiresAt !== undefined ? { expiresAt: next.expiresAt } : {}),
      });
    }

    this.onWrite();

    return next.result;
  }

  sweepExpiredEntries(limit = DEFAULT_SWEEP_BATCH_SIZE): number {
    let deletedCount = 0;

    if (!this.sweepIterator) {
      this.sweepIterator = this.storage.entries();
    }

    while (deletedCount < limit) {
      const next = this.sweepIterator.next();

      if (next.done) {
        delete this.sweepIterator;
        break;
      }

      const [key, entry] = next.value;

      if (deletedCount >= limit) {
        break;
      }

      if (!this.isExpired(entry.expiresAt)) {
        continue;
      }

      this.storage.delete(key);

      deletedCount += 1;
    }

    return deletedCount;
  }

  clear(): void {
    this.storage.clear();
    delete this.sweepIterator;
  }

  shutdown(): void {
    this.storage.clear();
    delete this.sweepIterator;
  }

  size(): number {
    return this.storage.size;
  }

  private onWrite(): void {
    this.writeCount += 1;

    if (this.writeCount % DEFAULT_SWEEP_INTERVAL !== 0) {
      return;
    }

    this.sweepExpiredEntries();
  }

  private maybeSweep(): void {
    const now = this.clock.now();

    if (now - this.lastSweepAt < DEFAULT_SWEEP_FREQUENCY_MS) {
      return;
    }

    this.lastSweepAt = now;

    this.sweepExpiredEntries();
  }

  private readActiveEntry(key: string): StorageEntry<TState> | undefined {
    const entry = this.storage.get(key);

    if (!entry) {
      return undefined;
    }

    if (this.isExpired(entry.expiresAt)) {
      this.storage.delete(key);

      return undefined;
    }

    return entry;
  }

  private isExpired(expiresAt?: UnixTimestampMs): boolean {
    return expiresAt !== undefined && expiresAt <= this.clock.now();
  }

  private assertCapacityFor(key: string): void {
    const maxEntries = this.options.maxEntries;

    if (maxEntries === undefined) {
      return;
    }

    if (this.storage.has(key)) {
      return;
    }

    if (this.storage.size < maxEntries) {
      return;
    }

    throw new RateLimiterInfrastructureError(`In-memory storage capacity exceeded (${maxEntries} entries)`);
  }
}

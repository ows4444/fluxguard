import type { UnixTimestampMs } from '@fluxguard/contracts';

export interface StorageEntry<TState> {
  readonly value: TState;

  readonly expiresAt?: UnixTimestampMs;
}

export type StorageUpdateResult<TState, TResult> =
  | {
      readonly expiresAt?: UnixTimestampMs;
      readonly result: TResult;
      readonly value: TState;
    }
  | {
      readonly expiresAt?: never;
      readonly result: TResult;
      readonly value?: undefined;
    };

export interface RuntimeStorage<TState> {
  get(key: string): TState | undefined;

  set(key: string, value: TState, expiresAt?: UnixTimestampMs): void;

  /**
   * Atomically updates a single storage key.
   *
   * Contract guarantees:
   * - updater observes a logically consistent state snapshot
   * - committed updates become atomically visible
   * - intermediate updater state MUST NOT be externally observable
   *
   * IMPORTANT:
   * - updater functions MUST remain side-effect free
   * - distributed implementations MAY execute updater multiple times
   *   under optimistic concurrency or retry contention
   * - callers MUST NOT rely on exactly-once updater execution
   *
   * Implementations MUST NOT:
   * - partially commit updates
   * - expose intermediate updater state
   */
  update<TResult>(
    key: string,
    transition: (current: TState | undefined) => StorageUpdateResult<TState, TResult>,
  ): TResult;

  delete(key: string): void;

  size(): number;

  clear(): void;

  shutdown?(): void;
}

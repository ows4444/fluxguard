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
   * Synchronously updates a single storage key.
   *
   * Guarantees for synchronous in-process implementations:
   * - updater executes once per invocation
   * - updater observes latest visible state
   *
   * Distributed or concurrent implementations MAY:
   * - require external locking
   * - reject under contention
   * - provide weaker consistency guarantees
   *
   * Implementations MUST NOT:
   * - partially commit updates
   * - expose intermediate updater state
   * - execute updater multiple times without isolation
   */
  update<TResult>(key: string, updater: (current: TState | undefined) => StorageUpdateResult<TState, TResult>): TResult;

  delete(key: string): void;

  size(): number;

  clear(): void;

  shutdown?(): void;
}

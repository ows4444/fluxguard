import type { RedisTimeCapability } from '../storage/contracts/storage-capabilities.interface';
import type { RuntimeClock } from './runtime-clock.interface';

export class RedisRuntimeClock implements RuntimeClock {
  readonly #storage: RedisTimeCapability;

  constructor(storage: RedisTimeCapability) {
    this.#storage = storage;
  }

  async now(): Promise<number> {
    return this.#storage.now();
  }
}

import type { ViolationStorageCapability } from '../../storage/contracts/index';

export interface ViolationTrackerOptions {
  readonly store: ViolationStorageCapability;
}

export class ViolationTrackerService {
  readonly #store: ViolationStorageCapability;

  constructor(options: ViolationTrackerOptions) {
    this.#store = options.store;
  }

  async increment(key: string, ttlMs: number): Promise<number> {
    const result = await this.#store.incrementViolations(key, ttlMs);

    return result.violations;
  }

  async get(key: string): Promise<number> {
    const result = await this.#store.getViolations(key);

    return result?.violations ?? 0;
  }
}

import type { RuntimeBlockingPolicy, RuntimeProgressiveBlockingPolicy } from '../../config/index';
import type { BlockingStorageCapability } from '../../storage/contracts/index';
import { BlockDurationStrategy } from './block-duration.strategy';

export interface ProgressiveBlockingServiceOptions {
  readonly store: BlockingStorageCapability;
}

export class ProgressiveBlockingService {
  readonly #store: BlockingStorageCapability;

  readonly #strategy = new BlockDurationStrategy();

  constructor(options: ProgressiveBlockingServiceOptions) {
    this.#store = options.store;
  }

  async block(
    key: string,
    violations: number,
    blocking: RuntimeBlockingPolicy | undefined,

    progressive: RuntimeProgressiveBlockingPolicy | undefined,
  ): Promise<number> {
    const duration = this.#strategy.calculate(violations, blocking, progressive);

    if (duration <= 0) {
      return 0;
    }

    await this.#store.setBlock(key, duration, 'RATE_LIMIT_BLOCK');

    return duration;
  }

  async isBlocked(key: string): Promise<boolean> {
    const result = await this.#store.getBlock(key);

    return result?.blocked ?? false;
  }

  async getBlock(key: string) {
    return this.#store.getBlock(key);
  }
}

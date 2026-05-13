import type { CounterStorageCapability } from '../../storage/contracts/index';
import type { AlgorithmConsumeResult, RuntimeAlgorithm } from '../shared/runtime-algorithm.interface';

export interface FixedWindowOptions {
  readonly limit: number;

  readonly durationMs: number;

  readonly storage: CounterStorageCapability;
}

export class FixedWindowAlgorithm implements RuntimeAlgorithm {
  readonly #limit: number;

  readonly #durationMs: number;

  readonly #storage: CounterStorageCapability;

  constructor(options: FixedWindowOptions) {
    this.#limit = options.limit;
    this.#durationMs = options.durationMs;
    this.#storage = options.storage;
  }

  async consume(key: string): Promise<AlgorithmConsumeResult> {
    const result = await this.#storage.incrementCounter(key, 1, this.#durationMs);

    const allowed = result.value <= this.#limit;

    return {
      allowed,

      reason: allowed ? 'ALLOWED' : 'LIMIT_EXCEEDED',

      remaining: Math.max(0, this.#limit - result.value),

      retryAfter: allowed ? 0 : result.expiresAt - Date.now(),

      resetTime: result.expiresAt,
    };
  }

  async peek(key: string): Promise<AlgorithmConsumeResult> {
    const current = await this.#storage.getCounter(key);

    const totalHits = current?.value ?? 0;

    const allowed = totalHits < this.#limit;

    return {
      allowed,

      reason: allowed ? 'ALLOWED' : 'LIMIT_EXCEEDED',

      remaining: Math.max(0, this.#limit - totalHits),

      retryAfter: 0,

      resetTime: 0,
    };
  }
}

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
    if ('consumeFixedWindow' in this.#storage) {
      const result = await this.#storage.consumeFixedWindow(key, this.#limit, this.#durationMs);

      return {
        allowed: result.allowed,

        reason: result.allowed ? 'ALLOWED' : 'LIMIT_EXCEEDED',

        remaining: result.remaining,

        retryAfter: result.retryAfter,

        resetTime: Date.now() + result.retryAfter,
      };
    }

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
    if ('peekFixedWindow' in this.#storage) {
      const result = await this.#storage.peekFixedWindow(key, this.#limit);

      return {
        allowed: result.remaining > 0,

        reason: result.remaining > 0 ? 'ALLOWED' : 'LIMIT_EXCEEDED',

        remaining: result.remaining,

        retryAfter: result.retryAfter,

        resetTime: Date.now() + result.retryAfter,
      };
    }

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

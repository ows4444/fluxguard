import type { GcraStorageCapability } from '../../storage/contracts/index';
import type { AlgorithmConsumeResult, RuntimeAlgorithm } from '../shared/runtime-algorithm.interface';

export interface GcraAlgorithmOptions {
  readonly emissionIntervalMs: number;

  readonly burstCapacity: number;

  readonly storage: GcraStorageCapability;
}

export class GcraAlgorithm implements RuntimeAlgorithm {
  readonly #interval: number;

  readonly #burstCapacity: number;

  readonly #storage: GcraStorageCapability;

  constructor(options: GcraAlgorithmOptions) {
    this.#interval = options.emissionIntervalMs;
    this.#burstCapacity = options.burstCapacity;
    this.#storage = options.storage;
  }

  async consume(key: string): Promise<AlgorithmConsumeResult> {
    if (!('consumeGcra' in this.#storage)) {
      return this.consumeFallback(key);
    }

    const result = await this.#storage.consumeGcra(key, this.#interval, this.#burstCapacity);

    return {
      reason: result.allowed ? 'ALLOWED' : 'LIMIT_EXCEEDED',

      allowed: result.allowed,

      remaining: result.remaining,

      retryAfter: result.retryAfter,

      resetTime: Date.now() + result.retryAfter,
    };
  }

  async peek(key: string): Promise<AlgorithmConsumeResult> {
    if ('peekGcra' in this.#storage) {
      const result = await this.#storage.peekGcra(key, this.#interval, this.#burstCapacity);

      return {
        reason: result.allowed ? 'ALLOWED' : 'LIMIT_EXCEEDED',

        allowed: result.allowed,

        remaining: result.remaining,

        retryAfter: result.retryAfter,

        resetTime: Date.now() + result.retryAfter,
      };
    }

    const now = Date.now();

    const current = await this.#storage.getGcraRecord(key);

    if (!current) {
      return {
        reason: 'ALLOWED',
        allowed: true,
        remaining: this.#burstCapacity,
        retryAfter: 0,
        resetTime: now,
      };
    }

    const allowAt = current.theoreticalArrivalTime - this.#burstCapacity * this.#interval;

    return {
      reason: 'ALLOWED',

      allowed: allowAt <= now,

      remaining: Math.max(
        0,
        Math.floor((this.#burstCapacity * this.#interval - (current.theoreticalArrivalTime - now)) / this.#interval),
      ),

      retryAfter: allowAt > now ? allowAt - now : 0,

      resetTime: current.expiresAt,
    };
  }
}

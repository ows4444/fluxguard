import { RedisClusterKeyFactory } from '../../../adapters/redis/internal/redis-cluster-key.factory';
import type { BurstConsumeCapability, BurstPeekCapability } from '../../../storage';
import type { AlgorithmConsumeResult, RuntimeAlgorithm } from '../shared/runtime-algorithm.interface';

export interface BurstAlgorithmOptions {
  readonly limit: number;

  readonly sustainedDurationMs: number;

  readonly burstCapacity: number;

  readonly burstWindowMs: number;

  readonly storage: BurstConsumeCapability & Partial<BurstPeekCapability>;
}

export class BurstAlgorithm implements RuntimeAlgorithm {
  readonly #limit: number;

  readonly #sustainedDurationMs: number;

  readonly #burstCapacity: number;

  readonly #burstWindowMs: number;

  readonly #storage: BurstConsumeCapability;

  constructor(options: BurstAlgorithmOptions) {
    this.#limit = options.limit;

    this.#sustainedDurationMs = options.sustainedDurationMs;

    this.#burstCapacity = options.burstCapacity;

    this.#burstWindowMs = options.burstWindowMs;

    this.#storage = options.storage;
  }

  async consume(key: string, _now: number, signal?: AbortSignal): Promise<AlgorithmConsumeResult> {
    const result = await this.#storage.consumeBurst(
      RedisClusterKeyFactory.scoped(key, 'sustained'),
      RedisClusterKeyFactory.scoped(key, 'burst'),
      this.#limit,
      this.#sustainedDurationMs,
      this.#burstCapacity,
      this.#burstWindowMs,
      signal,
    );

    return {
      allowed: result.allowed,

      blocked: false,

      degraded: false,

      remaining: result.remaining,

      retryAfter: result.retryAfter,

      reason: result.allowed ? 'ALLOWED' : 'LIMIT_EXCEEDED',
    };
  }

  async peek(key: string, _now: number, signal?: AbortSignal): Promise<AlgorithmConsumeResult> {
    if (!this.#storage.peekBurst) {
      throw new Error('Burst peek unsupported');
    }

    const result = await this.#storage.peekBurst(
      RedisClusterKeyFactory.scoped(key, 'sustained'),

      RedisClusterKeyFactory.scoped(key, 'burst'),

      this.#limit,

      this.#burstCapacity,
      signal,
    );

    return {
      allowed: result.remaining > 0,

      blocked: false,

      degraded: false,

      remaining: result.remaining,

      retryAfter: result.retryAfter,

      reason: result.remaining > 0 ? 'ALLOWED' : 'LIMIT_EXCEEDED',
    };
  }
}

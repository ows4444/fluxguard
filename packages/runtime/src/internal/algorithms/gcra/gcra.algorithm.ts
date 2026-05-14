import type { GcraConsumeCapability, GcraPeekCapability, GcraStorageCapability } from '../../../storage';
import type { AlgorithmConsumeResult, RuntimeAlgorithm } from '../shared/runtime-algorithm.interface';

export interface GcraAlgorithmOptions {
  readonly emissionIntervalMs: number;

  readonly burstCapacity: number;

  readonly storage: GcraStorageCapability & Partial<GcraConsumeCapability> & Partial<GcraPeekCapability>;
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
    const consume = this.#storage.consumeGcra;

    if (!consume) {
      return this.consumeFallback(key);
    }

    const result = await consume(key, this.#interval, this.#burstCapacity);

    return {
      reason: result.allowed ? 'ALLOWED' : 'LIMIT_EXCEEDED',

      allowed: result.allowed,

      remaining: result.remaining,

      retryAfter: result.retryAfter,
    };
  }

  private async consumeFallback(key: string): Promise<AlgorithmConsumeResult> {
    const now = Date.now();

    const current = await this.#storage.getGcraRecord(key);

    if (!current) {
      const tat = now + this.#interval;

      await this.#storage.setGcraRecord(key, {
        theoreticalArrivalTime: tat,
        expiresAt: tat + this.#burstCapacity * this.#interval,
      });

      return {
        reason: 'ALLOWED',
        allowed: true,
        remaining: this.#burstCapacity - 1,
        retryAfter: 0,
      };
    }

    const allowAt = current.theoreticalArrivalTime - (this.#burstCapacity - 1) * this.#interval;

    if (now < allowAt) {
      return {
        reason: 'LIMIT_EXCEEDED',
        allowed: false,
        remaining: 0,
        retryAfter: allowAt - now,
      };
    }

    const tat = Math.max(now, current.theoreticalArrivalTime) + this.#interval;

    await this.#storage.setGcraRecord(key, {
      theoreticalArrivalTime: tat,
      expiresAt: tat + this.#burstCapacity * this.#interval,
    });

    const virtualStart = tat - this.#burstCapacity * this.#interval;

    const distance = now - virtualStart;

    return {
      reason: 'ALLOWED',
      allowed: true,
      remaining: Math.max(0, Math.min(this.#burstCapacity - 1, Math.floor(distance / this.#interval))),
      retryAfter: 0,
    };
  }

  async peek(key: string): Promise<AlgorithmConsumeResult> {
    if (this.#storage.peekGcra) {
      const result = await this.#storage.peekGcra(key, this.#interval, this.#burstCapacity);

      return {
        reason: result.allowed ? 'ALLOWED' : 'LIMIT_EXCEEDED',

        allowed: result.allowed,

        remaining: result.remaining,

        retryAfter: result.retryAfter,
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
    };
  }
}

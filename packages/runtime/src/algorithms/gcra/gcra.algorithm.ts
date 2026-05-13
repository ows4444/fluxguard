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
    const now = Date.now();

    const current = (await this.#storage.getGcraRecord(key)) ?? {
      theoreticalArrivalTime: now,
      expiresAt: now,
    };

    const newTat = Math.max(current.theoreticalArrivalTime, now) + this.#interval;

    const allowAt = newTat - this.#burstCapacity * this.#interval;

    if (allowAt > now) {
      return {
        reason: 'LIMIT_EXCEEDED',
        allowed: false,
        remaining: 0,
        retryAfter: allowAt - now,
        resetTime: allowAt,
      };
    }

    const expiresAt = newTat + this.#burstCapacity * this.#interval;

    await this.#storage.setGcraRecord(key, {
      theoreticalArrivalTime: newTat,
      expiresAt,
    });

    return {
      reason: 'ALLOWED',
      allowed: true,
      remaining: Math.max(0, Math.floor((this.#burstCapacity * this.#interval - (newTat - now)) / this.#interval)),
      retryAfter: 0,
      resetTime: expiresAt,
    };
  }

  async peek(key: string): Promise<AlgorithmConsumeResult> {
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

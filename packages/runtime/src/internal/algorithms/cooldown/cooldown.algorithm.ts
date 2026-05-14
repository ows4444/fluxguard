import type { CooldownStorageCapability } from '../../../storage';
import type { AlgorithmConsumeResult, RuntimeAlgorithm } from '../shared/runtime-algorithm.interface';

export interface CooldownAlgorithmOptions {
  readonly durationMs: number;

  readonly storage: CooldownStorageCapability;
}

export class CooldownAlgorithm implements RuntimeAlgorithm {
  readonly #durationMs: number;

  readonly #storage: CooldownStorageCapability;

  constructor(options: CooldownAlgorithmOptions) {
    this.#durationMs = options.durationMs;
    this.#storage = options.storage;
  }

  async consume(key: string, now: number): Promise<AlgorithmConsumeResult> {
    const existing = await this.#storage.getCooldown(key);

    if (existing) {
      return {
        reason: 'LIMIT_EXCEEDED',
        allowed: false,
        remaining: 0,
        retryAfter: Math.max(0, existing.expiresAt - now),
      };
    }

    const record = await this.#storage.setCooldown(key, this.#durationMs);

    return {
      reason: 'ALLOWED',
      allowed: true,
      remaining: 0,
      retryAfter: 0,
    };
  }

  async peek(key: string, now: number): Promise<AlgorithmConsumeResult> {
    const existing = await this.#storage.getCooldown(key);

    if (!existing) {
      return { reason: 'ALLOWED', allowed: true, remaining: 1, retryAfter: 0 };
    }

    return {
      reason: 'LIMIT_EXCEEDED',
      allowed: false,
      remaining: 0,
      retryAfter: Math.max(0, existing.expiresAt - now),
    };
  }
}

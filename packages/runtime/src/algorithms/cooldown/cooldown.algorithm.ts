import type { CooldownStorageCapability } from '../../storage/contracts/index';
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

  async consume(key: string): Promise<AlgorithmConsumeResult> {
    const existing = await this.#storage.getCooldown(key);

    if (existing) {
      return {
        reason: 'LIMIT_EXCEEDED',
        allowed: false,
        remaining: 0,
        retryAfter: existing.expiresAt - Date.now(),
        resetTime: existing.expiresAt,
      };
    }

    const record = await this.#storage.setCooldown(key, this.#durationMs);

    return {
      reason: 'ALLOWED',
      allowed: true,
      remaining: 0,
      retryAfter: 0,
      resetTime: record.expiresAt,
    };
  }

  async peek(key: string): Promise<AlgorithmConsumeResult> {
    const existing = await this.#storage.getCooldown(key);

    if (!existing) {
      return { reason: 'ALLOWED', allowed: true, remaining: 1, retryAfter: 0, resetTime: Date.now() };
    }

    return {
      reason: 'LIMIT_EXCEEDED',
      allowed: false,
      remaining: 0,
      retryAfter: existing.expiresAt - Date.now(),
      resetTime: existing.expiresAt,
    };
  }
}

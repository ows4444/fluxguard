import { RateLimiterConsistencyError } from '../../errors/rate-limiter.errors';

import type { RedisClient } from '../../redis/types';

import type { RedisScriptRegistry } from '../../redis/script-registry';

export interface ExecuteAdjustmentOptions {
  readonly redis: RedisClient;

  readonly scripts: RedisScriptRegistry;

  readonly scriptName: string;

  readonly keys: string[];

  readonly amount?: number;

  readonly operationId?: string;

  readonly ttlSeconds: number;

  readonly direction: 'reward' | 'penalty';
}

export class AdjustmentService {
  static async execute(options: ExecuteAdjustmentOptions): Promise<void> {
    const amount = this.normalizeAmount(options.amount);

    const delta = options.direction === 'reward' ? -amount : amount;

    await options.scripts.execute(options.redis, options.scriptName, options.keys, [delta, options.ttlSeconds]);
  }

  static requireOperationId(operationId?: string): string {
    if (!operationId?.trim()) {
      throw new RateLimiterConsistencyError('Rate limiter adjustment requires operationId');
    }

    return operationId.trim();
  }

  private static normalizeAmount(amount?: number): number {
    const normalized = Math.floor(amount ?? 1);

    if (!Number.isFinite(normalized) || normalized <= 0) {
      throw new RateLimiterConsistencyError('Rate limiter adjustment amount must be positive');
    }

    return normalized;
  }
}

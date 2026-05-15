import type { RateLimitAdjustmentOptions } from '@fluxguard/contracts';

import type { RuntimeLimiterDefinition } from '../core';
import { RuntimeExecutionError } from '../errors';
import type { RuntimeStore } from '../storage/contracts/runtime-store.interface';

export interface RuntimeAdjustmentServiceOptions {
  readonly storage: RuntimeStore;
}

export class RuntimeAdjustmentService {
  readonly #storage: RuntimeStore;

  constructor(options: RuntimeAdjustmentServiceOptions) {
    this.#storage = options.storage;
  }

  async adjust(definition: RuntimeLimiterDefinition, key: string, options: RateLimitAdjustmentOptions): Promise<void> {
    const operationId = options.operationId ?? crypto.randomUUID();

    const operationKey = `${key}:op:${operationId}`;

    const runtime = definition.compiled.runtime;

    if (runtime.algorithm === 'burst') {
      if (!this.#storage.adjustBurstIdempotent) {
        throw new RuntimeExecutionError('Burst adjustments unsupported');
      }

      const result = await this.#storage.adjustBurstIdempotent(
        `${key}:sustained`,
        `${key}:burst`,
        operationKey,
        options.amount ?? 1,
        60,
      );

      if (result.duplicate) {
        throw new RuntimeExecutionError(`Duplicate adjustment operation: ${operationId}`);
      }

      if (result.expired) {
        throw new RuntimeExecutionError(`Adjustment target expired: ${key}`);
      }

      return;
    }

    if (runtime.algorithm === 'fixed') {
      if (!this.#storage.adjustFixedWindowIdempotent) {
        throw new RuntimeExecutionError('Fixed-window adjustments unsupported');
      }

      const result = await this.#storage.adjustFixedWindowIdempotent(key, operationKey, options.amount ?? 1, 60);

      if (result.duplicate) {
        throw new Error(`Duplicate adjustment operation: ${operationId}`);
      }

      if (result.expired) {
        throw new Error(`Adjustment target expired: ${key}`);
      }
    }
  }
}

import type { RateLimitAdjustmentOptions } from '@fluxguard/contracts';

import type { RuntimeLimiterDefinition } from '../core';
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
        throw new Error('Burst adjustments unsupported');
      }

      await this.#storage.adjustBurstIdempotent(
        `${key}:sustained`,
        `${key}:burst`,
        operationKey,
        options.amount ?? 1,
        60,
      );

      return;
    }

    if (runtime.algorithm === 'fixed') {
      if (!this.#storage.adjustFixedWindowIdempotent) {
        throw new Error('Fixed-window adjustments unsupported');
      }

      await this.#storage.adjustFixedWindowIdempotent(key, operationKey, options.amount ?? 1, 60);
    }
  }
}

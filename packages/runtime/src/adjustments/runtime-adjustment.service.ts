import type { RateLimitAdjustmentOptions } from '@fluxguard/contracts';

import type { RuntimeLimiterDefinition } from '../core';
import type { AdjustmentCapability } from '../storage/contracts/storage-capabilities.interface';

export interface RuntimeAdjustmentServiceOptions {
  readonly storage: AdjustmentCapability;
}

export class RuntimeAdjustmentService {
  readonly #storage: AdjustmentCapability;

  constructor(options: RuntimeAdjustmentServiceOptions) {
    this.#storage = options.storage;
  }

  async adjust(definition: RuntimeLimiterDefinition, key: string, options: RateLimitAdjustmentOptions): Promise<void> {
    const operationId = options.operationId ?? crypto.randomUUID();

    const operationKey = `${key}:op:${operationId}`;

    const runtime = definition.compiled.runtime;

    if (runtime.algorithm === 'burst') {
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
      await this.#storage.adjustFixedWindowIdempotent(key, operationKey, options.amount ?? 1, 60);
    }
  }
}

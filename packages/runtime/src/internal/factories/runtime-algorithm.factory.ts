import type { RuntimeLimiterConfig } from '../../config';
import { RuntimeExecutionError } from '../../errors';
import type { RuntimeStore } from '../../storage';
import { RuntimeCapabilityResolver } from '../../storage/capabilities';
import {
  BurstAlgorithm,
  CooldownAlgorithm,
  FixedWindowAlgorithm,
  GcraAlgorithm,
  type RuntimeAlgorithm,
} from '../algorithms/index';

export class RuntimeAlgorithmFactory {
  readonly #capabilities = new RuntimeCapabilityResolver();

  create(config: RuntimeLimiterConfig, storage: RuntimeStore): RuntimeAlgorithm {
    const capabilities = this.#capabilities.resolve(storage);

    switch (config.algorithm) {
      case 'fixed':
        if (!capabilities.atomicFixedWindow) {
          throw new RuntimeExecutionError('Store does not support fixed-window execution');
        }

        return new FixedWindowAlgorithm({
          limit: config.limit,
          durationMs: config.durationMs,
          storage,
        });

      case 'gcra':
        if (!capabilities.gcra) {
          throw new RuntimeExecutionError('Store does not support GCRA execution');
        }

        return new GcraAlgorithm({
          emissionIntervalMs: config.emissionIntervalMs,
          burstCapacity: config.burstCapacity,
          storage,
        });

      case 'burst':
        if (!capabilities.burst) {
          throw new RuntimeExecutionError('Store does not support burst execution');
        }

        return new BurstAlgorithm({
          limit: config.limit,
          sustainedDurationMs: config.sustainedDurationMs,
          burstCapacity: config.burstCapacity,
          burstWindowMs: config.burstWindowMs,
          storage,
        });

      case 'cooldown':
        return new CooldownAlgorithm({
          durationMs: config.durationMs,
          storage,
        });

      default:
        throw new RuntimeExecutionError(`Unsupported algorithm`);
    }
  }
}

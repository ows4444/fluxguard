import {
  BurstAlgorithm,
  CooldownAlgorithm,
  FixedWindowAlgorithm,
  GcraAlgorithm,
  type RuntimeAlgorithm,
} from '../algorithms/index';
import type { RuntimeLimiterConfig } from '../config/index';
import { RuntimeExecutionError } from '../errors/index';
import type { RuntimeStore } from '../storage/contracts/index';

export class RuntimeAlgorithmFactory {
  create(config: RuntimeLimiterConfig, storage: RuntimeStore): RuntimeAlgorithm {
    switch (config.algorithm) {
      case 'fixed':
        return new FixedWindowAlgorithm({
          limit: config.limit,
          durationMs: config.durationMs,
          storage,
        });

      case 'gcra':
        return new GcraAlgorithm({
          emissionIntervalMs: config.emissionIntervalMs,
          burstCapacity: config.burstCapacity,
          storage,
        });

      case 'burst':
        return new BurstAlgorithm({
          limit: config.limit,
          durationMs: config.burstWindowMs,
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

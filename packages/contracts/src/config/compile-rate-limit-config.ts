import { calculateBurstTolerance, calculateEmissionInterval } from '../algorithms/gcra';
import { durationToMilliseconds } from '../primitives';
import type { BaseCompiledState, CompiledGcraConfig, CompiledRateLimitConfig } from './compiled-rate-limit.types';
import { QUOTA_ALGORITHM, RATE_LIMIT_KIND } from './rate-limit.types';
import type { ValidatedConfig } from './rate-limit.validation';

export function compileRateLimitConfig(config: ValidatedConfig): CompiledRateLimitConfig {
  const baseCompiled: BaseCompiledState = {
    durationMs: durationToMilliseconds(config.duration),
  };

  if (config.kind === RATE_LIMIT_KIND.COOLDOWN) {
    return { ...config, compiled: baseCompiled };
  }

  if (config.algorithm !== QUOTA_ALGORITHM.GCRA) {
    return { ...config, compiled: baseCompiled };
  }

  const emissionInterval = calculateEmissionInterval(baseCompiled.durationMs, config.points);

  const burstCapacity = config.burst?.burstPoints ?? config.points;

  const burstTolerance = calculateBurstTolerance(emissionInterval, burstCapacity);

  const compiled: CompiledGcraConfig = {
    ...config,
    compiled: {
      ...baseCompiled,
      emissionInterval,
      burstCapacity,
      burstTolerance,
    },
  };

  return compiled;
}

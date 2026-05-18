import { calculateBurstTolerance, calculateEmissionInterval } from '../algorithms/gcra';
import { assertNever, durationMilliseconds, durationToMilliseconds } from '../primitives';
import type {
  BaseCompiledState,
  CompiledFixedWindowConfig,
  CompiledGcraConfig,
  CompiledRateLimitConfig,
} from './compiled-rate-limit.types';
import { QUOTA_ALGORITHM, RATE_LIMIT_KIND } from './rate-limit.types';
import type { NormalizedQuotaRateLimitConfig, ValidatedConfig } from './rate-limit.validation';

const DEFAULT_MAX_RETENTION_MS = durationMilliseconds(86_400_000);

function compileFixedQuota(
  config: Extract<NormalizedQuotaRateLimitConfig, { readonly algorithm: typeof QUOTA_ALGORITHM.FIXED }>,
  baseCompiled: BaseCompiledState,
): CompiledFixedWindowConfig {
  return {
    ...config,
    compiled: baseCompiled,
  };
}

function compileGcraQuota(
  config: Extract<NormalizedQuotaRateLimitConfig, { readonly algorithm: typeof QUOTA_ALGORITHM.GCRA }>,
  baseCompiled: BaseCompiledState,
): CompiledGcraConfig {
  const emissionInterval = calculateEmissionInterval(baseCompiled.durationMs, config.points);

  const burstCapacity = config.burst?.burstPoints ?? config.points;

  const burstTolerance = calculateBurstTolerance(emissionInterval, burstCapacity);

  const maxRetentionMs = config.burst?.maxRetentionMs ?? DEFAULT_MAX_RETENTION_MS;

  return {
    ...config,
    compiled: {
      ...baseCompiled,
      emissionInterval,
      burstCapacity,
      burstTolerance,
      maxRetentionMs,
    },
  };
}

export function compileRateLimitConfig(config: ValidatedConfig): CompiledRateLimitConfig {
  const baseCompiled: BaseCompiledState = {
    durationMs: durationToMilliseconds(config.duration),
  };

  if (config.kind === RATE_LIMIT_KIND.COOLDOWN) {
    return { ...config, compiled: baseCompiled };
  }

  switch (config.algorithm) {
    case QUOTA_ALGORITHM.FIXED:
      return compileFixedQuota(config, baseCompiled);

    case QUOTA_ALGORITHM.GCRA:
      return compileGcraQuota(config, baseCompiled);

    default:
      return assertNever(config);
  }
}

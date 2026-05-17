import {
  type Clock,
  type CompiledCooldownConfig,
  createAllowedDecision,
  createBlockedDecision,
  DECISION_OUTCOME,
  durationBetweenUnixTimestamps,
  durationMilliseconds,
  type RateLimitDecision,
} from '@fluxguard/contracts';

import { calculateCooldownExpiration } from '../expiration';
import type { CooldownState } from '../state';
import type { RuntimeStorage } from '../storage';
import { createExposureMetadata } from '../utils/exposure-metadata';

export interface CooldownConsumeDependencies {
  readonly clock: Clock;

  readonly cooldownStorage: RuntimeStorage<CooldownState>;
}

export function consumeCooldown(
  key: string,
  config: CompiledCooldownConfig,
  dependencies: CooldownConsumeDependencies,
): RateLimitDecision {
  const { clock, cooldownStorage } = dependencies;

  const now = clock.now();

  const cooldownUntil = calculateCooldownExpiration(now, config.compiled.durationMs);

  return cooldownStorage.update<RateLimitDecision>(key, (current) => {
    if (current && current.cooldownUntil > now) {
      return {
        value: current,
        expiresAt: current.cooldownUntil,
        result: createBlockedDecision({
          key,

          retryAfterMs: durationBetweenUnixTimestamps(current.cooldownUntil, now),
          exposure: createExposureMetadata(config.message, config.errorCode),
        }),
      };
    }

    return {
      value: {
        cooldownUntil,
      },
      expiresAt: cooldownUntil,
      result: createAllowedDecision({
        key,
        remainingPoints: null,
      }),
    };
  });
}

import {
  addConsumedRateLimitPoints,
  addDurationToUnixTimestamp,
  calculateRemainingRateLimitPoints,
  type Clock,
  type CompiledFixedWindowConfig,
  consumedRateLimitPoints,
  createAllowedDecision,
  createRejectedDecision,
  durationBetweenUnixTimestamps,
  type DurationMilliseconds,
  durationMilliseconds,
  emptyRemainingRateLimitPoints,
  type RateLimitDecision,
  type UnixTimestampMs,
} from '@fluxguard/contracts';

import { calculateFixedWindowExpiration } from '../expiration';
import type { QuotaWindowState } from '../state';
import type { RuntimeStorage } from '../storage';
import { createExposureMetadata } from '../utils/exposure-metadata';

export interface FixedWindowConsumeDependencies {
  readonly clock: Clock;

  readonly quotaStorage: RuntimeStorage<QuotaWindowState>;
}

function createInitialWindow(now: UnixTimestampMs, durationMs: DurationMilliseconds): QuotaWindowState {
  return {
    consumedPoints: consumedRateLimitPoints(0),
    resetAt: addDurationToUnixTimestamp(now, durationMs),
  };
}

export function consumeFixedWindow(
  key: string,
  config: CompiledFixedWindowConfig,
  dependencies: FixedWindowConsumeDependencies,
): RateLimitDecision {
  const { clock, quotaStorage } = dependencies;

  const now = clock.now();

  return quotaStorage.update<RateLimitDecision>(key, (current) => {
    const activeWindow =
      !current || current.resetAt <= now ? createInitialWindow(now, config.compiled.durationMs) : current;

    if (activeWindow.consumedPoints >= config.points) {
      return {
        value: activeWindow,
        expiresAt: activeWindow.resetAt,
        result: createRejectedDecision({
          key,
          remainingPoints: emptyRemainingRateLimitPoints(),
          retryAfterMs: durationBetweenUnixTimestamps(activeWindow.resetAt, now),
          exposure: createExposureMetadata(config.message, config.errorCode),
        }),
      };
    }

    const nextState: QuotaWindowState = {
      resetAt: activeWindow.resetAt,
      consumedPoints: addConsumedRateLimitPoints(activeWindow.consumedPoints, 1),
    };

    return {
      value: nextState,
      expiresAt: calculateFixedWindowExpiration(nextState.resetAt),
      result: createAllowedDecision({
        key,
        remainingPoints: calculateRemainingRateLimitPoints(config.points, nextState.consumedPoints),
      }),
    };
  });
}

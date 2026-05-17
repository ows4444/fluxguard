import {
  type CompiledGcraConfig,
  createAllowedDecision,
  createRejectedDecision,
  evaluateGcra,
  type MonotonicClock,
  type RateLimitDecision,
} from '@fluxguard/contracts';

import { calculateGcraExpiration } from '../expiration';
import type { GcraState } from '../state';
import type { RuntimeStorage } from '../storage';
import { createExposureMetadata } from '../utils/exposure-metadata';

export interface GcraConsumeDependencies {
  readonly clock: MonotonicClock;

  readonly gcraStorage: RuntimeStorage<GcraState>;
}

export function consumeGcra(
  key: string,
  config: CompiledGcraConfig,
  dependencies: GcraConsumeDependencies,
): RateLimitDecision {
  const { clock, gcraStorage } = dependencies;

  const snapshot = clock.snapshot();

  const now = snapshot.monotonicNow;
  const wallNow = snapshot.wallClockNow;

  const { burstTolerance, emissionInterval } = config.compiled;

  return gcraStorage.update<RateLimitDecision>(key, (current) => {
    const evaluation = evaluateGcra({
      now,
      theoreticalArrivalTime: current?.theoreticalArrivalTime,
      emissionInterval,
      burstTolerance,
      limit: config.points,
    });

    const storageExpiration = calculateGcraExpiration(
      wallNow,
      evaluation.nextTheoreticalArrivalTime,
      now,
      burstTolerance,
      emissionInterval,
    );

    if (!evaluation.allowed) {
      const result: RateLimitDecision = createRejectedDecision({
        key,
        remainingPoints: evaluation.remainingPoints,
        retryAfterMs: evaluation.retryAfterMs,
        exposure: createExposureMetadata(config.message, config.errorCode),
      });

      return {
        ...(current ? { value: current } : {}),
        expiresAt: storageExpiration,
        result,
      };
    }

    return {
      value: {
        theoreticalArrivalTime: evaluation.nextTheoreticalArrivalTime,
      },
      expiresAt: storageExpiration,
      result: createAllowedDecision({
        key,
        remainingPoints: evaluation.remainingPoints,
      }),
    };
  });
}

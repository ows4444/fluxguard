import {
  addDurations,
  addDurationToUnixTimestamp,
  type DurationMilliseconds,
  durationMilliseconds,
  type MonotonicTimestampMs,
  type UnixTimestampMs,
} from '@fluxguard/contracts';

export function calculateCooldownExpiration(now: UnixTimestampMs, durationMs: DurationMilliseconds): UnixTimestampMs {
  return addDurationToUnixTimestamp(now, durationMs);
}

export function calculateFixedWindowExpiration(resetAt: UnixTimestampMs): UnixTimestampMs {
  return resetAt;
}

export function calculateGcraExpiration(
  wallClockNow: UnixTimestampMs,
  theoreticalArrivalTime: MonotonicTimestampMs,
  now: MonotonicTimestampMs,
  burstTolerance: DurationMilliseconds,
  emissionInterval: DurationMilliseconds,
): UnixTimestampMs {
  const recoveryDuration = durationMilliseconds(Math.max(0, theoreticalArrivalTime - now));

  /**
   * Retain state long enough for:
   * - outstanding scheduling debt recovery
   * - burst recovery
   * - next emission transition
   */
  const retentionDuration = addDurations(recoveryDuration, addDurations(burstTolerance, emissionInterval));

  return addDurationToUnixTimestamp(wallClockNow, retentionDuration);
}

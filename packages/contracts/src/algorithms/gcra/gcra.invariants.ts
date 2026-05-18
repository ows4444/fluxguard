import type { DurationMilliseconds, RateLimitPoints } from '../../primitives';

export function assertValidGcraParameters(
  emissionInterval: DurationMilliseconds,
  burstTolerance: DurationMilliseconds,
  limit: RateLimitPoints,
): void {
  if (emissionInterval <= 0) {
    throw new RangeError('Emission interval must be positive');
  }

  if (burstTolerance < 0) {
    throw new RangeError('Burst tolerance cannot be negative');
  }

  if (limit <= 0) {
    throw new RangeError('Limit must be positive');
  }
}

import type { ConsumedRateLimitPoints, Priority, RateLimitPoints, RemainingRateLimitPoints } from './rate-limit.types';
import { assertSafeInteger } from './safe-integer';
import type { DurationMilliseconds, MonotonicTimestampMs, Seconds, UnixTimestampMs } from './time.types';

function assertFiniteNumber(value: number, type: string): void {
  if (!Number.isFinite(value)) {
    throw new TypeError(`${type} must be a finite number`);
  }
}

function assertFinitePositive(value: number, type: string): void {
  assertFiniteNumber(value, type);
  assertPositive(value, type);
}

function assertFiniteNonNegative(value: number, type: string): void {
  assertFiniteNumber(value, type);
  assertNonNegative(value, type);
}

function assertFiniteNonNegativeInteger(value: number, type: string): void {
  assertFiniteNonNegative(value, type);
  assertSafeInteger(value, type);
}

function assertFinitePositiveInteger(value: number, type: string): void {
  assertFinitePositive(value, type);
  assertSafeInteger(value, type);
}

function assertNonNegative(value: number, type: string): void {
  if (value < 0) {
    throw new RangeError(`${type} must be non-negative`);
  }
}

function assertPositive(value: number, type: string): void {
  if (value <= 0) {
    throw new RangeError(`${type} must be greater than zero`);
  }
}

export const durationMilliseconds = (value: number): DurationMilliseconds => {
  assertFiniteNonNegativeInteger(value, 'DurationMilliseconds');
  return value as DurationMilliseconds;
};

export const seconds = (value: number): Seconds => {
  assertFinitePositiveInteger(value, 'Seconds');
  return value as Seconds;
};

export const unixTimestampMs = (value: number): UnixTimestampMs => {
  assertFiniteNonNegativeInteger(value, 'UnixTimestampMs');
  return value as UnixTimestampMs;
};

export const rateLimitPoints = (value: number): RateLimitPoints => {
  assertFinitePositiveInteger(value, 'RateLimitPoints');
  return value as RateLimitPoints;
};

export const remainingRateLimitPoints = (value: number): RemainingRateLimitPoints => {
  assertFiniteNonNegativeInteger(value, 'RemainingRateLimitPoints');
  return value as RemainingRateLimitPoints;
};

export const consumedRateLimitPoints = (value: number): ConsumedRateLimitPoints => {
  assertFiniteNonNegativeInteger(value, 'ConsumedRateLimitPoints');
  return value as ConsumedRateLimitPoints;
};

export const priority = (value: number): Priority => {
  assertFiniteNonNegativeInteger(value, 'Priority');
  return value as Priority;
};

export const monotonicTimestampMs = (value: number): MonotonicTimestampMs => {
  assertFiniteNonNegativeInteger(value, 'MonotonicTimestampMs');

  return value as MonotonicTimestampMs;
};

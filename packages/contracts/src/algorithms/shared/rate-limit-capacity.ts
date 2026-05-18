import {
  type ConsumedRateLimitPoints,
  type RateLimitPoints,
  type RemainingRateLimitPoints,
  remainingRateLimitPoints,
} from '../../primitives';

export function calculateRemainingCapacity(
  limit: RateLimitPoints,
  consumed: ConsumedRateLimitPoints,
): RemainingRateLimitPoints {
  if (consumed > limit) {
    return remainingRateLimitPoints(0);
  }

  return remainingRateLimitPoints(limit - consumed);
}

import { RateLimiterInvariantError } from '../errors';

export function assertNever(value: never): never {
  throw new RateLimiterInvariantError(`Exhaustiveness assertion failed for unexpected value: ${String(value)}`);
}

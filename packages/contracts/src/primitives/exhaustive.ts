import { RateLimiterConfigurationError } from '../errors';

export function assertNever(value: never): never {
  throw new RateLimiterConfigurationError(`Unhandled value: ${String(value)}`);
}

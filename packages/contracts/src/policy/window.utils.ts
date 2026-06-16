import { assertNever } from '../primitives/assert';
import type { RateLimitWindow } from './window.types';

export function windowToMs(window: RateLimitWindow): number {
  switch (window.unit) {
    case 'second':
      return window.size * 1_000;

    case 'minute':
      return window.size * 60_000;

    case 'hour':
      return window.size * 3_600_000;

    case 'day':
      return window.size * 86_400_000;

    default:
      return assertNever(window.unit);
  }
}

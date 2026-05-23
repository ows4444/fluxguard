import { assertNever } from '../primitives/assert';
import type { RateLimitEnforcement } from './decision.contract';

export function isAllowedEnforcement(enforcement: RateLimitEnforcement): boolean {
  switch (enforcement.type) {
    case 'allow':
    case 'allow_burst':
    case 'shadow':
    case 'bypass':
      return true;

    case 'reject':
    case 'throttle':
    case 'degraded':
      return false;

    default:
      return assertNever(enforcement);
  }
}

export function isBurstEnforcement(enforcement: RateLimitEnforcement): boolean {
  return enforcement.type === 'allow_burst';
}

export function isDegradedEnforcement(
  enforcement: RateLimitEnforcement,
): enforcement is Extract<RateLimitEnforcement, { readonly type: 'degraded' }> {
  return enforcement.type === 'degraded';
}

export function isThrottleEnforcement(
  enforcement: RateLimitEnforcement,
): enforcement is Extract<RateLimitEnforcement, { readonly type: 'throttle' }> {
  return enforcement.type === 'throttle';
}

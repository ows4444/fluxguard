import { assertNever } from '../primitives/assert';
import type { RateLimitDecision, RateLimitEnforcement } from './decision.contract';

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

export function isBurstEnforcement(
  enforcement: RateLimitEnforcement,
): enforcement is Extract<RateLimitEnforcement, { readonly type: 'allow_burst' }> {
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

export function isSuccessfulDecision(
  decision: RateLimitDecision,
): decision is Extract<RateLimitDecision, { readonly type: 'success' }> {
  return decision.type === 'success';
}

export function isBypassDecision(
  decision: RateLimitDecision,
): decision is Extract<RateLimitDecision, { readonly type: 'bypass' }> {
  return decision.type === 'bypass';
}

export function isRejectEnforcement(
  enforcement: RateLimitEnforcement,
): enforcement is Extract<RateLimitEnforcement, { readonly type: 'reject' }> {
  return enforcement.type === 'reject';
}

export function isBypassEnforcement(
  enforcement: RateLimitEnforcement,
): enforcement is Extract<RateLimitEnforcement, { readonly type: 'bypass' }> {
  return enforcement.type === 'bypass';
}

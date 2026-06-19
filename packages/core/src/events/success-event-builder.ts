import type {
  BaseRateLimitEventPayload,
  EventEnvelope,
  RateLimitEventPayloadMap,
  RateLimitEventType,
} from '@fluxguard/contracts';
import { assertNever, type RateLimitDecision, type RateLimitEvent } from '@fluxguard/contracts';

export function createSuccessEvent(
  decision: Extract<RateLimitDecision, { readonly type: 'success' }>,
  basePayload: BaseRateLimitEventPayload,
  envelope: <T extends RateLimitEventType>(type: T) => Omit<EventEnvelope<T, RateLimitEventPayloadMap[T]>, 'payload'>,
): RateLimitEvent {
  switch (decision.enforcement.type) {
    case 'allow':
      return {
        ...envelope('rate_limit.allowed'),
        payload: basePayload,
      };

    case 'allow_burst':
      return {
        ...envelope('rate_limit.allowed_burst'),
        payload: {
          ...basePayload,
          burstRemaining: decision.enforcement.burstRemaining,
        },
      };

    case 'reject':
      return {
        ...envelope('rate_limit.rejected'),
        payload: {
          ...basePayload,
          retryAfterMs: decision.enforcement.retryAfterMs,
        },
      };

    case 'throttle':
      return {
        ...envelope('rate_limit.throttled'),
        payload: {
          ...basePayload,
          retryAfterMs: decision.enforcement.retryAfterMs,
          shedProbability: decision.enforcement.shedProbability,
        },
      };

    case 'shadow':
      return {
        ...envelope('rate_limit.shadow'),
        payload: basePayload,
      };

    default:
      return assertNever(decision.enforcement);
  }
}

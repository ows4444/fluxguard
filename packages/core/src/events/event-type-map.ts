import type { RateLimitDecision, RateLimitEventType } from '@fluxguard/contracts';

export const DECISION_EVENT_TYPES = Object.freeze({
  policy_miss: 'rate_limit.policy_miss',
  rule_miss: 'rate_limit.rule_miss',
  bypass: 'rate_limit.bypassed',
  degraded: 'rate_limit.degraded',
} as const satisfies Partial<Record<RateLimitDecision['type'], RateLimitEventType>>);

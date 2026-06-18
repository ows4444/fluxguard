import { RateLimitEventRegistry } from './event.registry';

export const RATE_LIMIT_EVENT_SCHEMA_VERSION = {
  'rate_limit.allowed': 1,
  'rate_limit.allowed_burst': 1,
  'rate_limit.bypassed': 1,
  'rate_limit.degraded': 1,
  'rate_limit.rejected': 1,
  'rate_limit.throttled': 1,
  'rate_limit.shadow': 1,
  'rate_limit.policy_miss': 1,
  'rate_limit.rule_miss': 1,
  'rate_limit.reset': 1,
} as const satisfies {
  [K in keyof typeof RateLimitEventRegistry]: (typeof RateLimitEventRegistry)[K]['schemaVersion'];
};

import { deepFreeze } from '../primitives/deep-freeze';
import type { RateLimitEventPayloadMap } from './event.contract';
import type { EventRegistry } from './event.types';

export const RateLimitEventRegistry = deepFreeze({
  'rate_limit.allowed': {
    schemaVersion: 1,
    severity: 'info',
    compatibility: 'backward-compatible',
    dataClassification: 'restricted',
  },
  'rate_limit.allowed_burst': {
    schemaVersion: 1,
    severity: 'info',
    compatibility: 'backward-compatible',
    dataClassification: 'restricted',
  },
  'rate_limit.bypassed': {
    schemaVersion: 1,
    severity: 'info',
    compatibility: 'backward-compatible',
    dataClassification: 'restricted',
  },
  'rate_limit.degraded': {
    schemaVersion: 1,
    severity: 'critical',
    compatibility: 'backward-compatible',
    dataClassification: 'restricted',
  },
  'rate_limit.rejected': {
    schemaVersion: 1,
    severity: 'warn',
    compatibility: 'backward-compatible',
    dataClassification: 'restricted',
  },
  'rate_limit.throttled': {
    schemaVersion: 1,
    severity: 'warn',
    compatibility: 'backward-compatible',
    dataClassification: 'restricted',
  },
  'rate_limit.shadow': {
    schemaVersion: 1,
    severity: 'info',
    compatibility: 'backward-compatible',
    dataClassification: 'restricted',
  },

  'rate_limit.rule_miss': {
    schemaVersion: 1,
    severity: 'info',
    compatibility: 'backward-compatible',
    dataClassification: 'internal',
  },

  'rate_limit.store_timeout': {
    schemaVersion: 1,
    severity: 'warn',
    compatibility: 'backward-compatible',
    dataClassification: 'internal',
  },
  'rate_limit.reset': {
    schemaVersion: 1,
    severity: 'info',
    compatibility: 'backward-compatible',
    dataClassification: 'internal',
  },
} as const satisfies EventRegistry<RateLimitEventPayloadMap>);

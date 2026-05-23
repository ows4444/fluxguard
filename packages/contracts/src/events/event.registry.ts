import { deepFreeze } from '../primitives/deep-freeze';
import type { EventRegistryEntry } from './event.types';

export const RateLimitEventRegistry = deepFreeze({
  'rate_limit.allowed': { schemaVersion: 1, severity: 'info', compatibility: 'backward-compatible' },
  'rate_limit.allowed_burst': { schemaVersion: 1, severity: 'info', compatibility: 'backward-compatible' },
  'rate_limit.bypassed': { schemaVersion: 1, severity: 'info', compatibility: 'backward-compatible' },
  'rate_limit.degraded': { schemaVersion: 1, severity: 'critical', compatibility: 'backward-compatible' },
  'rate_limit.rejected': { schemaVersion: 1, severity: 'warn', compatibility: 'backward-compatible' },
  'rate_limit.reset': { schemaVersion: 1, severity: 'warn', compatibility: 'backward-compatible' },
  'rate_limit.rule_miss': { schemaVersion: 1, severity: 'info', compatibility: 'backward-compatible' },
  'rate_limit.shadow': { schemaVersion: 1, severity: 'info', compatibility: 'backward-compatible' },
  'rate_limit.store_timeout': { schemaVersion: 1, severity: 'warn', compatibility: 'backward-compatible' },
  'rate_limit.throttled': { schemaVersion: 1, severity: 'warn', compatibility: 'backward-compatible' },
} as const satisfies Record<string, EventRegistryEntry>);

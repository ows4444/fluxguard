import { deepFreeze } from '../primitives/deep-freeze';
import { mapObjectValues } from '../primitives/object';
import { RateLimitEventRegistry } from './event.registry';

export const RATE_LIMIT_EVENT_SCHEMA_VERSION = deepFreeze(
  mapObjectValues(RateLimitEventRegistry, (definition) => definition.schemaVersion),
);

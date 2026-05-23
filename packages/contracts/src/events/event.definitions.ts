import { deepFreeze } from '../primitives/deep-freeze';
import { mapObjectValues } from '../primitives/object';
import { RateLimitEventRegistry } from './event.registry';

export const RateLimitEventDefinitions = deepFreeze(
  mapObjectValues(RateLimitEventRegistry, (definition) => ({
    severity: definition.severity,
    compatibility: definition.compatibility,
  })),
);

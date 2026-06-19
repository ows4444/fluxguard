import { pickSchemaVersions } from '../primitives/object';
import { RateLimitEventRegistry } from './event.registry';
import { validateEventRegistry } from './event-registry-validator';

validateEventRegistry(RateLimitEventRegistry);

export const RATE_LIMIT_EVENT_SCHEMA_VERSION = pickSchemaVersions(RateLimitEventRegistry);

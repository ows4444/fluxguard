import { pickSchemaVersions } from '../primitives/object';
import { RateLimitEventRegistry } from './event.registry';

export const RATE_LIMIT_EVENT_SCHEMA_VERSION = pickSchemaVersions(RateLimitEventRegistry);

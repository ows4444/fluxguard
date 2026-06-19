import type { EventRegistry } from './event.types';

export function validateEventRegistry(registry: EventRegistry<object>): void {
  for (const [eventType, definition] of Object.entries(registry)) {
    if (definition.schemaVersion < 1) {
      throw new Error(`Invalid schemaVersion for ${eventType}`);
    }

    if (typeof definition.payloadRevision !== 'string' || definition.payloadRevision.length === 0) {
      throw new Error(`Missing payloadRevision for ${eventType}`);
    }
  }
}

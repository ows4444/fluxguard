import type { EventDataClassification, EventSchemaCompatibility, RateLimitEventSeverity } from './event.types';

export interface EventSchemaMetadata {
  readonly schemaVersion: number;

  readonly payloadRevision: string;

  readonly severity: RateLimitEventSeverity;

  readonly compatibility: EventSchemaCompatibility;

  readonly dataClassification: EventDataClassification;
}

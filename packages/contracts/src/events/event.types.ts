export type RateLimitEventSeverity = 'info' | 'warn' | 'critical';

export type EventSchemaCompatibility = 'backward-compatible' | 'breaking';

export type EventDataClassification = 'public' | 'internal' | 'restricted';

export interface EventDefinition {
  readonly compatibility: EventSchemaCompatibility;
  readonly dataClassification: EventDataClassification;
  readonly severity: RateLimitEventSeverity;
}

export interface EventRegistryEntry extends EventDefinition {
  readonly schemaVersion: number;

  readonly payloadRevision: string;
}

export type EventRegistry<TPayloadMap extends object> = {
  readonly [K in keyof TPayloadMap]: EventRegistryEntry;
};

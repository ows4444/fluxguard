export type RateLimitEventSeverity = 'info' | 'warn' | 'critical';

export type EventSchemaCompatibility = 'backward-compatible' | 'breaking';

export interface EventDefinition {
  readonly severity: RateLimitEventSeverity;

  readonly compatibility: EventSchemaCompatibility;
}

export interface EventRegistryEntry extends EventDefinition {
  readonly schemaVersion: number;
}

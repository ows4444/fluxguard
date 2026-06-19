export interface TracingContext {
  readonly causationId?: string;
  readonly correlationId?: string;
  readonly spanId?: string;
  readonly traceId?: string;
}

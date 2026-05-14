export interface RuntimeExecutionMetricsEvent {
  readonly limiter: string;

  readonly durationMs: number;

  readonly success: boolean;

  readonly degraded: boolean;

  readonly blocked: boolean;

  readonly timestamp: number;
}

export interface RuntimeTracingEvent {
  readonly limiter: string;

  readonly operation: 'consume' | 'peek' | 'adjust';

  readonly startedAt: number;

  readonly finishedAt: number;

  readonly durationMs: number;

  readonly success: boolean;

  readonly error?: string;
}

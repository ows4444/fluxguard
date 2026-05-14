export type RuntimeDecisionReason = 'ALLOWED' | 'LIMIT_EXCEEDED' | 'BLOCKED' | 'DEGRADED' | 'ERROR';

export interface AlgorithmConsumeResult {
  readonly allowed: boolean;

  readonly blocked?: boolean;

  readonly degraded?: boolean;

  readonly remaining: number;

  readonly retryAfter: number;

  readonly reason: RuntimeDecisionReason;

  readonly metadata?: Record<string, unknown>;
}

export interface RuntimeAlgorithm {
  consume(key: string): Promise<AlgorithmConsumeResult>;

  peek(key: string): Promise<AlgorithmConsumeResult>;
}

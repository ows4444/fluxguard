import type { StoreFailureType } from '../store/store.failure';

export interface RateLimitDiagnostics {
  readonly totalEvaluationDurationUs: number;

  readonly algorithmDurationUs?: number;

  readonly primaryStoreDurationUs?: number;

  readonly retryCount?: number;

  readonly usedReplicaRead?: boolean;

  readonly terminalStoreFailureType?: StoreFailureType;
}

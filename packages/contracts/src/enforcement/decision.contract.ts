import type { BypassReason, RateLimitEvaluationSnapshot } from '../domain/rate-limit.shared';
import type { RateLimitDiagnostics } from '../runtime/diagnostics.contract';
import type { StoreFailure, StoreFailureType } from '../store/store.failure';

export interface RateLimitEvaluation extends RateLimitEvaluationSnapshot {
  readonly nextAllowedAtMs?: number;
}

export interface DegradedRateLimitEvaluation {
  readonly source: 'primary' | 'replica' | 'cache' | 'fallback';

  readonly ruleId?: string;

  readonly remaining?: number;

  readonly resetAtMs?: number;

  readonly stale?: boolean;
}

export type RateLimitEnforcement =
  | { readonly type: 'allow' }
  | {
      readonly burstRemaining: number;
      readonly type: 'allow_burst';
    }
  | {
      readonly retryAfterMs: number;
      readonly type: 'reject';
    }
  | {
      readonly retryAfterMs: number;
      readonly shedProbability: number;
      readonly type: 'throttle';
    }
  | { readonly type: 'shadow' }
  | {
      readonly reason: BypassReason;
      readonly type: 'bypass';
    }
  | {
      readonly failOpen: boolean;
      readonly storeFailureType: StoreFailureType;
      readonly type: 'degraded';
    };

export type RateLimitDecision =
  | {
      readonly type: 'policy_miss';
    }
  | {
      readonly type: 'rule_miss';
    }
  | {
      readonly diagnostics?: RateLimitDiagnostics;
      readonly reason: BypassReason;
      readonly type: 'bypass';
    }
  | {
      readonly diagnostics?: RateLimitDiagnostics;
      readonly enforcement: Exclude<RateLimitEnforcement, { readonly type: 'degraded' }>;
      readonly evaluation: RateLimitEvaluation;
      readonly type: 'success';
    }
  | {
      readonly diagnostics?: RateLimitDiagnostics;
      readonly enforcement: Extract<RateLimitEnforcement, { readonly type: 'degraded' }>;
      readonly evaluation?: DegradedRateLimitEvaluation;
      readonly failure: StoreFailure;
      readonly type: 'degraded';
    };

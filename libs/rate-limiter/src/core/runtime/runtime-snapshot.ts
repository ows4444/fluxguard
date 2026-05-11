import type {
  RuntimeLimiterConfig,
  RuntimeExecutionPolicy,
  RuntimeResiliencePolicy,
  RuntimeExposurePolicy,
  RuntimeAdjustmentPolicy,
  RuntimeIdentityPolicy,
  RuntimeBlockingPolicy,
  RuntimeProgressiveBlockingPolicy,
} from '../../module/rate-limiter.interfaces';

export interface RuntimeSnapshot {
  readonly runtime: RuntimeLimiterConfig;
  readonly execution: RuntimeExecutionPolicy;
  readonly resilience: RuntimeResiliencePolicy;
  readonly exposure: RuntimeExposurePolicy;
  readonly adjustments: RuntimeAdjustmentPolicy;
  readonly identity: RuntimeIdentityPolicy;
  readonly blocking?: RuntimeBlockingPolicy;
  readonly progressiveBlocking?: RuntimeProgressiveBlockingPolicy;
}

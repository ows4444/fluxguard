import type {
  RuntimeAdjustmentPolicy,
  RuntimeExecutionPolicy,
  RuntimeExposurePolicy,
  RuntimeIdentityPolicy,
  RuntimeResiliencePolicy,
} from '../../config/index';

export interface RuntimeExecutionDescriptor {
  readonly execution: RuntimeExecutionPolicy;

  readonly resilience: RuntimeResiliencePolicy;

  readonly exposure: RuntimeExposurePolicy;

  readonly identity: RuntimeIdentityPolicy;

  readonly adjustment: RuntimeAdjustmentPolicy;
}

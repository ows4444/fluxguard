import type { CompiledRateLimitConfig, RateLimitAdjustmentOptions } from '../config';
import type { PeekResult, RateLimitDecision } from '../decisions';
import type { RuntimeCapabilities } from './runtime-capabilities.types';
import type { PeekConsistency } from './runtime-consistency.types';
import type { RuntimeHealthStatus } from './runtime-health.types';
import type { RuntimeMetadata } from './runtime-metadata.types';
import type { ShutdownOptions } from './runtime-shutdown.types';

export interface ConsumeCommand {
  readonly key: string;

  readonly correlationId?: string;

  readonly config: CompiledRateLimitConfig;
}

export interface PeekCommand {
  readonly key: string;

  readonly correlationId?: string;

  readonly config: CompiledRateLimitConfig;

  /**
   * advisory:
   * - best effort
   * - may return stale state
   *
   * consistent:
   * - must reflect authoritative state
   * - runtime must throw RateLimiterConsistencyError
   *   when guarantees cannot be satisfied
   */
  readonly consistency?: PeekConsistency;
}

export interface RuntimeStore {
  readonly metadata: RuntimeMetadata;

  readonly capabilities: RuntimeCapabilities;

  /**
   * Consumes a single rate limit point.
   *
   * Contract:
   * - side-effecting
   * - non-idempotent unless implementation states otherwise
   * - atomic only within declared runtime guarantees
   * - implementations may reject during degraded operation
   */
  consume(command: ConsumeCommand): Promise<RateLimitDecision>;

  /**
   * Observes limiter state without mutation.
   *
   * advisory:
   * - may be stale
   *
   * consistent:
   * - must reflect authoritative state
   * - MUST throw RateLimiterConsistencyError
   *   when guarantees cannot be satisfied
   */
  peek(command: PeekCommand): Promise<PeekResult>;

  health(): Promise<RuntimeHealthStatus>;

  shutdown(options?: ShutdownOptions): Promise<void>;
}

export interface AdjustableRuntimeStore extends RuntimeStore {
  readonly capabilities: RuntimeCapabilities & {
    readonly adjustments: true;
  };

  adjust(options: RateLimitAdjustmentOptions): Promise<void>;
}

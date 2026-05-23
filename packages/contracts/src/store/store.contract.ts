import type { ConsumeCommand, ConsumeOutcome, PeekCommand, PeekOutcome } from './store.command';

export type StoreHealthStatus = 'healthy' | 'degraded' | 'unavailable';

export interface StoreHealthReport {
  readonly checkedAtMs: number;
  readonly latencyMs: number;
  readonly message?: string;
  readonly status: StoreHealthStatus;
}

interface BaseRateLimitStoreCapabilities {
  readonly consistentPeek: boolean;

  readonly expectedLatencyMs: number;
  readonly idempotent: boolean;

  readonly durability: 'memory-only' | 'persistent';
  readonly replication: 'single-node' | 'primary-replica' | 'multi-primary';
}

export interface StrongConsistencyCapabilities extends BaseRateLimitStoreCapabilities {
  readonly consistency: 'strong';
}

export interface EventualConsistencyCapabilities extends BaseRateLimitStoreCapabilities {
  readonly consistency: 'eventual';
  readonly peekStalenessMs: number;
}

export type RateLimitStoreCapabilities = StrongConsistencyCapabilities | EventualConsistencyCapabilities;

export interface IRateLimitStore {
  capabilities(): RateLimitStoreCapabilities;

  consume(command: ConsumeCommand): Promise<ConsumeOutcome>;

  health(): Promise<StoreHealthReport>;

  peek(command: PeekCommand): Promise<PeekOutcome>;
}

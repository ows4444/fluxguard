import type { RuntimeStoreCapabilities } from './runtime-store.capabilities';
import type { RuntimeHealthCapability } from './runtime-store.health';
import type {
  AdjustmentCapability,
  BlockingStorageCapability,
  BurstConsumeCapability,
  CooldownStorageCapability,
  CounterStorageCapability,
  FixedWindowConsumeCapability,
  GcraConsumeCapability,
  GcraStorageCapability,
  KeyValueStorageCapability,
  PeekCapability,
  ProgressiveBlockingCapability,
  RedisTimeCapability,
  TokenBucketStorageCapability,
  ViolationStorageCapability,
} from './storage-capabilities.interface';

export interface RuntimeStore
  extends
    CounterStorageCapability,
    GcraStorageCapability,
    CooldownStorageCapability,
    TokenBucketStorageCapability,
    BlockingStorageCapability,
    ViolationStorageCapability,
    KeyValueStorageCapability,
    RuntimeHealthCapability {
  initialize?(): Promise<void>;

  destroy?(): void | Promise<void>;

  consumeGcra?: GcraConsumeCapability['consumeGcra'];

  consumeFixedWindow?: FixedWindowConsumeCapability['consumeFixedWindow'];

  consumeWithProgressiveBlocking?: ProgressiveBlockingCapability['consumeWithProgressiveBlocking'];

  consumeBurst?: BurstConsumeCapability['consumeBurst'];

  adjustFixedWindowIdempotent?: AdjustmentCapability['adjustFixedWindowIdempotent'];

  adjustBurstIdempotent?: AdjustmentCapability['adjustBurstIdempotent'];

  now?: RedisTimeCapability['now'];

  peekFixedWindow?: PeekCapability['peekFixedWindow'];

  peekBurst?: PeekCapability['peekBurst'];

  peekGcra?: PeekCapability['peekGcra'];
}

export interface RuntimeCapableStore {
  capabilities(): RuntimeStoreCapabilities;
}

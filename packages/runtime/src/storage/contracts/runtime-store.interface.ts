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
    RuntimeHealthCapability,
    GcraConsumeCapability,
    FixedWindowConsumeCapability,
    ProgressiveBlockingCapability,
    BurstConsumeCapability,
    AdjustmentCapability,
    RedisTimeCapability,
    PeekCapability {}

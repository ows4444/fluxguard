import type { RuntimeHealthCapability } from './runtime-store.health';
import type {
  BlockingStorageCapability,
  CooldownStorageCapability,
  CounterStorageCapability,
  GcraStorageCapability,
  KeyValueStorageCapability,
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
    RuntimeHealthCapability {}

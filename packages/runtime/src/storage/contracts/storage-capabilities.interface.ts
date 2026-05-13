import type {
  BlockRecord,
  CooldownRecord,
  CounterRecord,
  GcraRecord,
  TokenBucketRecord,
  ViolationRecord,
} from './storage-record.types';

export interface CounterStorageCapability {
  incrementCounter(key: string, incrementBy: number, durationMs: number): Promise<CounterRecord>;

  getCounter(key: string): Promise<CounterRecord | null>;
}

export interface GcraStorageCapability {
  setGcraRecord(key: string, record: GcraRecord): Promise<void>;

  getGcraRecord(key: string): Promise<GcraRecord | null>;
}

export interface CooldownStorageCapability {
  setCooldown(key: string, durationMs: number): Promise<CooldownRecord>;

  getCooldown(key: string): Promise<CooldownRecord | null>;
}

export interface TokenBucketStorageCapability {
  setTokenBucket(key: string, record: TokenBucketRecord): Promise<void>;

  getTokenBucket(key: string): Promise<TokenBucketRecord | null>;
}

export interface BlockingStorageCapability {
  setBlock(key: string, durationMs: number, reason?: string): Promise<BlockRecord>;

  getBlock(key: string): Promise<BlockRecord | null>;
}

export interface ViolationStorageCapability {
  incrementViolations(key: string, ttlMs: number): Promise<ViolationRecord>;

  getViolations(key: string): Promise<ViolationRecord | null>;
}

export interface KeyValueStorageCapability {
  delete(key: string): Promise<void>;
}

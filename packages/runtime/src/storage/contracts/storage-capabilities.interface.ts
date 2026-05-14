import type {
  BlockRecord,
  BurstConsumeResult,
  BurstPeekResult,
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

export interface GcraConsumeCapability {
  consumeGcra(
    key: string,
    emissionMs: number,
    burst: number,
  ): Promise<{
    allowed: boolean;
    remaining: number;
    retryAfter: number;
  }>;
}

export interface FixedWindowPeekCapability {
  peekFixedWindow(
    key: string,
    limit: number,
  ): Promise<{
    current: number;
    remaining: number;
    retryAfter: number;
  }>;
}

export interface GcraPeekCapability {
  peekGcra(
    key: string,
    emissionMs: number,
    burst: number,
  ): Promise<{
    allowed: boolean;
    remaining: number;
    retryAfter: number;
  }>;
}

export interface FixedWindowConsumeCapability {
  consumeFixedWindow(
    key: string,
    limit: number,
    durationMs: number,
  ): Promise<{
    allowed: boolean;
    current: number;
    remaining: number;
    retryAfter: number;
  }>;
}

export interface BlockingConsumeCapability {
  consumeBlockedFixedWindow(
    key: string,
    blockKey: string,
    limit: number,
    durationMs: number,
  ): Promise<{
    allowed: boolean;
    blocked: boolean;
    remaining: number;
    retryAfter: number;
  }>;
}

export interface ProgressiveBlockingCapability {
  consumeWithProgressiveBlocking(
    key: string,
    blockKey: string,
    violationKey: string,
    limit: number,
    durationMs: number,
    initialBlockSeconds: number,
    multiplier: number,
    maxBlockSeconds: number,
    violationTtlSeconds: number,
  ): Promise<{
    allowed: boolean;
    blocked: boolean;
    remaining: number;
    retryAfter: number;
  }>;
}

export interface BurstConsumeCapability {
  consumeBurst(
    sustainedKey: string,
    burstKey: string,
    sustainedLimit: number,
    sustainedDurationMs: number,
    burstLimit: number,
    burstDurationMs: number,
  ): Promise<BurstConsumeResult>;
}

export interface BurstPeekCapability {
  peekBurst(
    sustainedKey: string,
    burstKey: string,
    sustainedLimit: number,
    burstLimit: number,
  ): Promise<BurstPeekResult>;
}

export interface AdjustmentCapability {
  adjustFixedWindowIdempotent(
    limiterKey: string,
    operationKey: string,
    delta: number,
    operationTtlSeconds: number,
  ): Promise<{ applied: boolean; duplicate: boolean; expired: boolean; value: number }>;

  adjustBurstIdempotent(
    sustainedKey: string,
    burstKey: string,
    operationKey: string,
    delta: number,
    operationTtlSeconds: number,
  ): Promise<{ applied: boolean; burst: number; duplicate: boolean; expired: boolean; sustained: number }>;
}

export interface RedisTimeCapability {
  now(): Promise<number>;
}
export interface PeekCapability extends FixedWindowPeekCapability, BurstPeekCapability, GcraPeekCapability {}

import { Redis } from 'ioredis';

import type { RuntimeStoreHealth } from '../contracts/runtime-store.health';
import type { RuntimeStore } from '../contracts/runtime-store.interface';
import type {
  BlockRecord,
  CooldownRecord,
  CounterRecord,
  GcraRecord,
  TokenBucketRecord,
  ViolationRecord,
} from '../contracts/storage-record.types';

export interface RedisRuntimeStoreOptions {
  readonly client: Redis;
}

export class RedisRuntimeStore implements RuntimeStore {
  readonly #client: Redis;

  constructor(options: RedisRuntimeStoreOptions) {
    this.#client = options.client;
  }

  async health(): Promise<RuntimeStoreHealth> {
    const started = Date.now();

    try {
      await this.#client.ping();

      return {
        healthy: true,
        degraded: false,
        latencyMs: Date.now() - started,
      };
    } catch (error) {
      return {
        healthy: false,
        degraded: true,
        latencyMs: Date.now() - started,
        reason: error instanceof Error ? error.message : 'UNKNOWN',
      };
    }
  }

  async incrementCounter(key: string, incrementBy: number, durationMs: number): Promise<CounterRecord> {
    const value = await this.#client.incrby(key, incrementBy);

    const ttl = await this.#client.pttl(key);

    if (ttl < 0) {
      await this.#client.pexpire(key, durationMs);
    }

    return {
      value,
      expiresAt: Date.now() + durationMs,
    };
  }

  async getCounter(key: string): Promise<CounterRecord | null> {
    const value = await this.#client.get(key);

    if (!value) {
      return null;
    }

    const ttl = await this.#client.pttl(key);

    return {
      value: Number(value),
      expiresAt: Date.now() + ttl,
    };
  }

  async setGcraRecord(key: string, record: GcraRecord): Promise<void> {
    const ttl = Math.max(1, record.expiresAt - Date.now());

    await this.#client.set(key, JSON.stringify(record), 'PX', ttl);
  }

  async getGcraRecord(key: string): Promise<GcraRecord | null> {
    const raw = await this.#client.get(key);

    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as GcraRecord;
  }

  async setCooldown(key: string, durationMs: number): Promise<CooldownRecord> {
    const record: CooldownRecord = {
      active: true,
      expiresAt: Date.now() + durationMs,
    };

    await this.#client.set(key, JSON.stringify(record), 'PX', durationMs);

    return record;
  }

  async getCooldown(key: string): Promise<CooldownRecord | null> {
    const raw = await this.#client.get(key);

    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as CooldownRecord;
  }
  async setTokenBucket(key: string, record: TokenBucketRecord): Promise<void> {
    const ttl = Math.max(1, record.expiresAt - Date.now());

    await this.#client.set(key, JSON.stringify(record), 'PX', ttl);
  }

  async getTokenBucket(key: string): Promise<TokenBucketRecord | null> {
    const raw = await this.#client.get(key);

    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as TokenBucketRecord;
  }

  async setBlock(key: string, durationMs: number, reason?: string): Promise<BlockRecord> {
    const record: BlockRecord = {
      blocked: true,
      expiresAt: Date.now() + durationMs,
      ...(reason ? { reason } : {}),
    };

    await this.#client.set(key, JSON.stringify(record), 'PX', durationMs);

    return record;
  }

  async getBlock(key: string): Promise<BlockRecord | null> {
    const raw = await this.#client.get(key);

    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as BlockRecord;
  }

  async incrementViolations(key: string, ttlMs: number): Promise<ViolationRecord> {
    const value = await this.#client.incr(key);

    const ttl = await this.#client.pttl(key);

    if (ttl < 0) {
      await this.#client.pexpire(key, ttlMs);
    }

    return {
      violations: value,
      expiresAt: Date.now() + ttlMs,
    };
  }
  async getViolations(key: string): Promise<ViolationRecord | null> {
    const value = await this.#client.get(key);

    if (!value) {
      return null;
    }

    const ttl = await this.#client.pttl(key);

    return {
      violations: Number(value),
      expiresAt: Date.now() + ttl,
    };
  }

  async delete(key: string): Promise<void> {
    await this.#client.del(key);
  }
}

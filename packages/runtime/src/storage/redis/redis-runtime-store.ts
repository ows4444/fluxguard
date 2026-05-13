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
import { burstAdjustIdempotentScript } from './scripts/adjustments/burst-adjust-idempotent.lua';
import { fixedWindowAdjustIdempotentScript } from './scripts/adjustments/fixed-window-adjust-idempotent.lua';
import { burstConsumeScript } from './scripts/burst/burst-consume.lua';
import { fixedWindowAtomicConsumeScript } from './scripts/fixed-window/fixed-window-atomic-consume.lua';
import { fixedWindowBlockingConsumeScript } from './scripts/fixed-window/fixed-window-blocking-consume.lua';
import { fixedWindowProgressiveBlockingScript } from './scripts/fixed-window/fixed-window-progressive-blocking.lua';
import { gcraConsumeScript } from './scripts/gcra/gcra-consume.lua';
import { RuntimeLuaExecutor } from './scripts/runtime-lua.executor';
import { RuntimeScriptPreloader } from './scripts/runtime-script.preloader';
import { redisTimeScript } from './scripts/system/redis-time.lua';
import { fixedWindowPeekScript } from './scripts/fixed-window/fixed-window-peek.lua';
import { burstPeekScript } from './scripts/burst/burst-peek.lua';
import { gcraPeekScript } from './scripts/gcra/gcra-peek.lua';

export interface RedisRuntimeStoreOptions {
  readonly client: Redis;
}

export class RedisRuntimeStore implements RuntimeStore {
  readonly #client: Redis;
  readonly #lua: RuntimeLuaExecutor;

  readonly #preloader: RuntimeScriptPreloader;

  constructor(options: RedisRuntimeStoreOptions) {
    this.#client = options.client;

    this.#lua = new RuntimeLuaExecutor(this.#client);

    this.#preloader = new RuntimeScriptPreloader(this.#client);

    void this.#preloader.preload();
  }

  async now(): Promise<number> {
    return this.#lua.execute(redisTimeScript, [], []);
  }

  async peekFixedWindow(
    key: string,
    limit: number,
  ): Promise<{
    remaining: number;
    retryAfter: number;
    current: number;
  }> {
    const [remaining, retryAfter, current] = await this.#lua.execute(fixedWindowPeekScript, [key], [limit]);

    return {
      remaining,
      retryAfter,
      current,
    };
  }

  async peekGcra(
    key: string,
    emissionMs: number,
    burst: number,
  ): Promise<{
    allowed: boolean;
    retryAfter: number;
    remaining: number;
  }> {
    const [allowed, retryAfter, remaining] = await this.#lua.execute(gcraPeekScript, [key], [emissionMs, burst]);

    return {
      allowed: allowed === 1,
      retryAfter,
      remaining,
    };
  }

  async peekBurst(
    sustainedKey: string,
    burstKey: string,
    sustainedLimit: number,
    burstLimit: number,
  ): Promise<{
    remaining: number;
    retryAfter: number;
  }> {
    const [remaining, retryAfter] = await this.#lua.execute(
      burstPeekScript,
      [sustainedKey, burstKey],
      [sustainedLimit, burstLimit],
    );

    return {
      remaining,
      retryAfter,
    };
  }

  async adjustBurstIdempotent(
    sustainedKey: string,
    burstKey: string,
    operationKey: string,
    delta: number,
    operationTtlSeconds: number,
  ): Promise<{
    applied: boolean;
    duplicate: boolean;
    expired: boolean;
    sustained: number;
    burst: number;
  }> {
    const [applied, sustained, burst] = await this.#lua.execute(
      burstAdjustIdempotentScript,
      [sustainedKey, burstKey, operationKey],
      [delta, operationTtlSeconds],
    );

    if (sustained === 'duplicate') {
      return {
        applied: false,
        duplicate: true,
        expired: false,
        sustained: 0,
        burst: 0,
      };
    }

    if (sustained === 'expired') {
      return {
        applied: false,
        duplicate: false,
        expired: true,
        sustained: 0,
        burst: 0,
      };
    }

    return {
      applied: applied === 1,
      duplicate: false,
      expired: false,
      sustained: Number(sustained),
      burst: Number(burst ?? 0),
    };
  }

  async adjustFixedWindowIdempotent(
    limiterKey: string,
    operationKey: string,
    delta: number,
    operationTtlSeconds: number,
  ): Promise<{
    applied: boolean;
    duplicate: boolean;
    expired: boolean;
    value: number;
  }> {
    const [applied, result] = await this.#lua.execute(
      fixedWindowAdjustIdempotentScript,
      [limiterKey, operationKey],
      [delta, operationTtlSeconds],
    );

    if (result === 'duplicate') {
      return {
        applied: false,
        duplicate: true,
        expired: false,
        value: 0,
      };
    }

    if (result === 'expired') {
      return {
        applied: false,
        duplicate: false,
        expired: true,
        value: 0,
      };
    }

    return {
      applied: applied === 1,
      duplicate: false,
      expired: false,
      value: Number(result),
    };
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
    const current = await this.#client.incrby(key, incrementBy);

    if (current === incrementBy) {
      await this.#client.pexpire(key, durationMs);
    }

    const ttl = await this.#client.pttl(key);

    return {
      value: current,
      expiresAt: Date.now() + Math.max(ttl, 0),
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

  async consumeWithProgressiveBlocking(
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
    remaining: number;
    retryAfter: number;
    blocked: boolean;
  }> {
    const [allowed, remaining, retryAfter, blocked] = await this.#lua.execute(
      fixedWindowProgressiveBlockingScript,
      [key, blockKey, violationKey],
      [limit, durationMs, initialBlockSeconds, multiplier, maxBlockSeconds, violationTtlSeconds],
    );

    return {
      allowed: allowed === 1,
      remaining,
      retryAfter,
      blocked: blocked === 1,
    };
  }

  async setGcraRecord(key: string, record: GcraRecord): Promise<void> {
    const ttl = Math.max(1, record.expiresAt - Date.now());

    await this.#client.set(key, JSON.stringify(record), 'PX', ttl);
  }

  async consumeBurst(
    sustainedKey: string,
    burstKey: string,
    sustainedLimit: number,
    sustainedDurationMs: number,
    burstLimit: number,
    burstDurationMs: number,
  ): Promise<{
    allowed: boolean;
    remaining: number;
    retryAfter: number;
    sustainedCurrent: number;
    burstCurrent: number;
  }> {
    const [allowed, remaining, retryAfter, sustainedCurrent, burstCurrent] = await this.#lua.execute(
      burstConsumeScript,
      [sustainedKey, burstKey],
      [sustainedLimit, sustainedDurationMs, burstLimit, burstDurationMs],
    );

    return {
      allowed: allowed === 1,
      remaining,
      retryAfter,
      sustainedCurrent,
      burstCurrent,
    };
  }

  async consumeGcra(
    key: string,
    emissionMs: number,
    burst: number,
  ): Promise<{
    allowed: boolean;
    retryAfter: number;
    remaining: number;
  }> {
    const [allowed, retryAfter, remaining] = await this.#lua.execute(gcraConsumeScript, [key], [emissionMs, burst]);

    return {
      allowed: allowed === 1,
      retryAfter,
      remaining,
    };
  }

  async consumeFixedWindow(
    key: string,
    limit: number,
    durationMs: number,
  ): Promise<{
    allowed: boolean;
    remaining: number;
    retryAfter: number;
    current: number;
  }> {
    const [allowed, remaining, retryAfter, current] = await this.#lua.execute(
      fixedWindowAtomicConsumeScript,
      [key],
      [limit, durationMs],
    );

    return {
      allowed: allowed === 1,
      remaining,
      retryAfter,
      current,
    };
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

  async consumeBlockedFixedWindow(
    key: string,
    blockKey: string,
    limit: number,
    durationMs: number,
  ): Promise<{
    allowed: boolean;
    remaining: number;
    retryAfter: number;
    blocked: boolean;
  }> {
    const [allowed, remaining, retryAfter, blocked] = await this.#lua.execute(
      fixedWindowBlockingConsumeScript,
      [key, blockKey],
      [limit, durationMs],
    );

    return {
      allowed: allowed === 1,
      remaining,
      retryAfter,
      blocked: blocked === 1,
    };
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

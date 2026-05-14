import type { RuntimeStoreCapabilities } from '../contracts';
import type { RuntimeStore } from '../contracts/runtime-store.interface';
import type {
  BlockRecord,
  CooldownRecord,
  CounterRecord,
  GcraRecord,
  TokenBucketRecord,
  ViolationRecord,
} from '../contracts/storage-record.types';
import { MemoryLockManager } from './internal/memory-lock.manager';

interface Entry<T> {
  value: T;

  expiresAt: number;
}

export class InMemoryRateLimitStore implements RuntimeStore {
  readonly #store = new Map<string, Entry<unknown>>();

  readonly #locks = new MemoryLockManager();

  capabilities(): RuntimeStoreCapabilities {
    return {
      atomicFixedWindow: true,

      gcra: true,

      burst: false,

      progressiveBlocking: false,

      adjustments: false,

      peek: true,

      distributedTime: false,
    };
  }

  async consumeFixedWindow(
    key: string,
    limit: number,
    durationMs: number,
  ): Promise<{ allowed: boolean; current: number; remaining: number; retryAfter: number }> {
    const current = await this.incrementCounter(key, 1, durationMs);

    const allowed = current.value <= limit;

    return {
      allowed,
      current: current.value,
      remaining: Math.max(0, limit - current.value),
      retryAfter: allowed ? 0 : current.expiresAt - Date.now(),
    };
  }

  async now(): Promise<number> {
    return Date.now();
  }

  async peekFixedWindow(
    key: string,
    limit: number,
  ): Promise<{ current: number; remaining: number; retryAfter: number }> {
    const current = await this.getCounter(key);

    const value = current?.value ?? 0;

    return {
      current: value,
      remaining: Math.max(0, limit - value),
      retryAfter: current ? Math.max(0, current.expiresAt - Date.now()) : 0,
    };
  }

  async setBlock(key: string, durationMs: number, reason?: string): Promise<BlockRecord> {
    const record: BlockRecord = {
      blocked: true,
      expiresAt: Date.now() + durationMs,
      ...(reason ? { reason } : {}),
    };

    this.#store.set(key, {
      value: record,
      expiresAt: record.expiresAt,
    });

    return record;
  }

  async getBlock(key: string): Promise<BlockRecord | null> {
    const existing = this.#store.get(key) as Entry<BlockRecord> | undefined;

    if (!existing || existing.expiresAt <= Date.now()) {
      return null;
    }

    return existing.value;
  }

  async incrementViolations(key: string, ttlMs: number): Promise<ViolationRecord> {
    const now = Date.now();

    const existing = this.#store.get(key) as Entry<ViolationRecord> | undefined;

    if (!existing || existing.expiresAt <= now) {
      const record: ViolationRecord = {
        violations: 1,
        expiresAt: now + ttlMs,
      };

      this.#store.set(key, {
        value: record,
        expiresAt: record.expiresAt,
      });

      return record;
    }

    const updated: ViolationRecord = {
      violations: existing.value.violations + 1,

      expiresAt: existing.expiresAt,
    };

    existing.value = updated;

    return updated;
  }

  async getViolations(key: string): Promise<ViolationRecord | null> {
    const existing = this.#store.get(key) as Entry<ViolationRecord> | undefined;

    if (!existing || existing.expiresAt <= Date.now()) {
      return null;
    }

    return existing.value;
  }

  async incrementCounter(key: string, incrementBy: number, durationMs: number): Promise<CounterRecord> {
    return this.#locks.execute(key, async () => {
      const now = Date.now();

      const existing = this.#store.get(key) as Entry<CounterRecord> | undefined;

      if (!existing || existing.expiresAt <= now) {
        const record: CounterRecord = {
          value: incrementBy,
          expiresAt: now + durationMs,
        };

        this.#store.set(key, {
          value: record,
          expiresAt: record.expiresAt,
        });

        return record;
      }

      const updated: CounterRecord = {
        value: existing.value.value + incrementBy,
        expiresAt: existing.expiresAt,
      };

      existing.value = updated;

      return updated;
    });
  }

  async getCounter(key: string): Promise<CounterRecord | null> {
    const existing = this.#store.get(key) as Entry<CounterRecord> | undefined;

    if (!existing || existing.expiresAt <= Date.now()) {
      return null;
    }

    return existing.value;
  }

  async setGcraRecord(key: string, record: GcraRecord): Promise<void> {
    this.#store.set(key, {
      value: record,
      expiresAt: record.expiresAt,
    });
  }

  async consumeGcra(
    key: string,
    emissionMs: number,
    burst: number,
  ): Promise<{
    allowed: boolean;
    remaining: number;
    retryAfter: number;
  }> {
    const now = Date.now();

    const current = await this.getGcraRecord(key);

    const tat = current?.theoreticalArrivalTime ?? now;

    const allowedAt = tat - (burst - 1) * emissionMs;

    if (now < allowedAt) {
      return {
        allowed: false,
        retryAfter: allowedAt - now,
        remaining: 0,
      };
    }

    const newTat = Math.max(now, tat) + emissionMs;

    const expiresAt = newTat + burst * emissionMs;

    await this.setGcraRecord(key, {
      theoreticalArrivalTime: newTat,
      expiresAt,
    });

    const virtualStart = newTat - burst * emissionMs;

    const distance = now - virtualStart;

    const remaining = Math.max(0, Math.min(burst - 1, Math.floor(distance / emissionMs)));

    return {
      allowed: true,
      retryAfter: 0,
      remaining,
    };
  }

  async getGcraRecord(key: string): Promise<GcraRecord | null> {
    const existing = this.#store.get(key) as Entry<GcraRecord> | undefined;

    if (!existing || existing.expiresAt <= Date.now()) {
      return null;
    }

    return existing.value;
  }

  async setCooldown(key: string, durationMs: number): Promise<CooldownRecord> {
    const record: CooldownRecord = {
      active: true,
      expiresAt: Date.now() + durationMs,
    };

    this.#store.set(key, {
      value: record,
      expiresAt: record.expiresAt,
    });

    return record;
  }

  async getCooldown(key: string): Promise<CooldownRecord | null> {
    const existing = this.#store.get(key) as Entry<CooldownRecord> | undefined;

    if (!existing || existing.expiresAt <= Date.now()) {
      return null;
    }

    return existing.value;
  }

  async getTokenBucket(key: string): Promise<TokenBucketRecord | null> {
    const existing = this.#store.get(key) as Entry<TokenBucketRecord> | undefined;

    if (!existing || existing.expiresAt <= Date.now()) {
      return null;
    }

    return existing.value;
  }

  async setTokenBucket(key: string, record: TokenBucketRecord): Promise<void> {
    this.#store.set(key, {
      value: record,
      expiresAt: record.expiresAt,
    });
  }

  async health() {
    return {
      healthy: true,
      degraded: false,
      latencyMs: 0,
    };
  }

  async delete(key: string): Promise<void> {
    this.#store.delete(key);
  }
}

import type { RuntimeStore } from '../contracts/runtime-store.interface';
import type {
  BlockRecord,
  CooldownRecord,
  CounterRecord,
  GcraRecord,
  TokenBucketRecord,
  ViolationRecord,
} from '../contracts/storage-record.types';

interface Entry<T> {
  value: T;

  expiresAt: number;
}

export class InMemoryRateLimitStore implements RuntimeStore {
  readonly #store = new Map<string, Entry<unknown>>();

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

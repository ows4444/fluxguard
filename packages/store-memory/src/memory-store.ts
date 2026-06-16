import type {
  ConsumeCommand,
  ConsumeOutcome,
  ConsumeResult,
  IRateLimitStore,
  PeekCommand,
  PeekOutcome,
  RateLimiterResetCommand,
  RateLimitStoreCapabilities,
  ResetResult,
  StoreHealthReport,
} from '@fluxguard/contracts';

interface CounterState {
  count: number;
  limit: number;
  resetAtMs: number;
}

interface IdempotencyRecord {
  readonly expiresAtMs: number;
  readonly result: ConsumeResult;
}

export class MemoryStore implements IRateLimitStore {
  private readonly counters = new Map<string, CounterState>();

  private readonly idempotencyCache = new Map<string, IdempotencyRecord>();

  private operations = 0;

  private sweepExpired(nowMs: number): void {
    this.operations++;

    if (this.operations % 1000 !== 0) {
      return;
    }

    const expiredCounters: string[] = [];
    for (const [key, value] of this.counters.entries()) {
      if (value.resetAtMs <= nowMs) expiredCounters.push(key);
    }
    for (const key of expiredCounters) this.counters.delete(key);

    const expiredIdempotency: string[] = [];
    for (const [key, value] of this.idempotencyCache.entries()) {
      if (value.expiresAtMs <= nowMs) expiredIdempotency.push(key);
    }
    for (const key of expiredIdempotency) this.idempotencyCache.delete(key);
  }

  capabilities(): RateLimitStoreCapabilities {
    return {
      consistency: 'strong',
      consistentPeek: true,
      durability: 'memory-only',
      expectedLatencyMs: 0,
      idempotent: true,
      replication: 'single-node',
    };
  }

  async consume(command: ConsumeCommand): Promise<ConsumeOutcome> {
    this.sweepExpired(command.nowMs);
    const cached = this.idempotencyCache.get(command.idempotencyKey);
    if (cached && cached.expiresAtMs > command.nowMs) {
      return { ...cached.result, fromIdempotencyCache: true };
    }

    let state = this.counters.get(command.key);

    if (!state || state.resetAtMs <= command.nowMs) {
      state = { count: 0, limit: command.limit, resetAtMs: command.nowMs + command.windowMs };
    } else if (state.limit !== command.limit) {
      state = { count: 0, limit: command.limit, resetAtMs: command.nowMs + command.windowMs };
    }

    const nextCount = state.count + command.cost;

    const allowed = nextCount <= command.limit;

    if (allowed) {
      state.count = nextCount;
    }

    this.counters.set(command.key, state);

    const result: ConsumeResult = {
      ok: true,
      allowed,
      fromIdempotencyCache: false,
      fromReplica: false,
      remaining: Math.max(0, state.limit - state.count),
      resetAtMs: state.resetAtMs,
    };

    if (allowed) {
      this.idempotencyCache.set(command.idempotencyKey, {
        expiresAtMs: command.nowMs + command.idempotencyTtlMs,
        result,
      });
    }

    return result;
  }

  async peek(command: PeekCommand): Promise<PeekOutcome> {
    const state = this.counters.get(command.key);

    if (!state || state.resetAtMs <= command.nowMs) {
      return {
        ok: true,
        consistency: command.consistency,
        exists: false,
        fromReplica: false,
        remaining: 0,
        resetAtMs: 0,
      };
    }

    return {
      ok: true,
      consistency: command.consistency,
      exists: true,
      fromReplica: false,
      remaining: Math.max(0, state.limit - state.count),
      resetAtMs: state.resetAtMs,
    };
  }

  async health(): Promise<StoreHealthReport> {
    return {
      checkedAtMs: Date.now(),
      latencyMs: 0,
      status: 'healthy',
    };
  }

  async reset(command: RateLimiterResetCommand): Promise<ResetResult> {
    if (command.keyPrefix !== undefined && command.keyPrefix.length === 0) {
      throw new Error(
        'keyPrefix must be a non-empty string or undefined. ' + 'To reset all keys, omit keyPrefix entirely.',
      );
    }
    if (command.keyPrefix === undefined) {
      const deletedCount = this.counters.size;

      this.counters.clear();

      return {
        deletedCount,
      };
    }

    let deletedCount = 0;

    const toDelete: string[] = [];
    for (const key of this.counters.keys()) {
      if (key.startsWith(command.keyPrefix)) toDelete.push(key);
    }
    for (const key of toDelete) {
      this.counters.delete(key);
      deletedCount++;
    }

    return {
      deletedCount,
    };
  }
}

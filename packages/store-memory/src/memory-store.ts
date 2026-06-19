import {
  assertNever,
  type ConsumeCommand,
  type ConsumeOutcome,
  type ConsumeResult,
  InvalidResetCommandError,
  type IRateLimitStore,
  type PeekCommand,
  type PeekOutcome,
  type RateLimiterResetCommand,
  type RateLimitStoreCapabilities,
  type ResetResult,
  type StoreHealthReport,
  UnsupportedStoreModeError,
} from '@fluxguard/contracts';

const MAX_SWEEP_ENTRIES = 1000;

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

  private static readonly CAPABILITIES: RateLimitStoreCapabilities = Object.freeze({
    consistency: 'strong',
    supportedModes: ['counter'] as const,
    consistentPeek: true,
    durability: 'memory-only',
    expectedLatencyMs: 0,
    idempotent: true,
    replication: 'single-node',
  });

  private sweepTimer: NodeJS.Timeout | undefined;

  constructor(private readonly sweepIntervalMs = 30_000) {
    this.sweepTimer = setInterval(() => this.sweepExpired(Date.now()), this.sweepIntervalMs);
    this.sweepTimer.unref?.();
  }

  private sweepExpired(nowMs: number): void {
    let swept = 0;
    for (const [key, value] of this.counters.entries()) {
      if (swept >= MAX_SWEEP_ENTRIES) break;
      if (value.resetAtMs <= nowMs) {
        this.counters.delete(key);
        swept++;
      }
    }

    swept = 0;
    for (const [key, value] of this.idempotencyCache.entries()) {
      if (swept >= MAX_SWEEP_ENTRIES) break;
      if (value.expiresAtMs <= nowMs) {
        this.idempotencyCache.delete(key);
        swept++;
      }
    }
  }

  capabilities(): RateLimitStoreCapabilities {
    return MemoryStore.CAPABILITIES;
  }

  async consume(command: ConsumeCommand): Promise<ConsumeOutcome> {
    switch (command.mode) {
      case 'counter':
        break;

      case 'token-bucket':
        throw new UnsupportedStoreModeError(command.mode, this.capabilities().supportedModes);

      default:
        return assertNever(command.mode);
    }

    let state = this.counters.get(command.key);

    if (!state || state.resetAtMs <= command.nowMs) {
      state = {
        count: 0,
        limit: command.limit,
        resetAtMs: command.resetAtMs ?? command.nowMs + command.windowMs,
      };
    } else if (state.limit !== command.limit) {
      state = {
        count: Math.min(state.count, command.limit),
        limit: command.limit,
        resetAtMs: state.resetAtMs,
      };
    }

    let cacheKey: string | undefined;

    if (command.idempotencyKey !== undefined) {
      cacheKey = `${command.key}:${command.idempotencyKey}`;

      const cached = this.idempotencyCache.get(cacheKey);

      if (cached && cached.expiresAtMs > command.nowMs) {
        return {
          ...cached.result,
          remaining: Math.max(0, Math.min(cached.result.remaining, command.limit)),

          fromIdempotencyCache: true,
        };
      }
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
      remaining: Math.max(0, command.limit - state.count),
      resetAtMs: state.resetAtMs,
    };

    if (cacheKey !== undefined && command.idempotencyTtlMs !== undefined) {
      this.idempotencyCache.set(cacheKey, {
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
      throw new InvalidResetCommandError(
        'keyPrefix must be a non-empty string or undefined. To reset all keys, omit keyPrefix entirely.',
      );
    }
    if (command.keyPrefix === undefined) {
      const deletedCount = this.counters.size;
      const deletedIdempotencyKeys = this.idempotencyCache.size;

      this.counters.clear();
      this.idempotencyCache.clear();

      return {
        deletedCount,
        deletedIdempotencyKeys,
      };
    }

    let deletedCount = 0;

    const toDelete: string[] = [];
    for (const key of this.counters.keys()) {
      if (key.startsWith(command.keyPrefix)) {
        toDelete.push(key);
      }
    }
    for (const key of toDelete) {
      this.counters.delete(key);
      deletedCount++;
    }

    const idempotencyKeysToDelete: string[] = [];

    for (const cacheKey of this.idempotencyCache.keys()) {
      if (cacheKey.startsWith(command.keyPrefix)) {
        idempotencyKeysToDelete.push(cacheKey);
      }
    }

    let deletedIdempotencyKeys = 0;
    for (const cacheKey of idempotencyKeysToDelete) {
      this.idempotencyCache.delete(cacheKey);
      deletedIdempotencyKeys++;
    }

    return {
      deletedCount,
      deletedIdempotencyKeys,
    };
  }

  dispose(): void {
    if (this.sweepTimer) {
      clearInterval(this.sweepTimer);
      this.sweepTimer = undefined;
    }
  }
}

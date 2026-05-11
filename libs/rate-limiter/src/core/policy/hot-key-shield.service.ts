import { Injectable } from '@nestjs/common';
import { MonotonicClockService } from '../time/monotonic.time';
import { Probabilistic } from '../utils/probabilistic';

interface State {
  count: number;

  updatedAt: number;
}

@Injectable()
export class HotKeyShieldService {
  private readonly maxEntries = Number(process.env.RATE_LIMITER_HOTKEY_MAX_KEYS ?? 25_000);

  private readonly mitigationThreshold = Number(process.env.RATE_LIMITER_HOTKEY_MITIGATION_THRESHOLD ?? 10000);

  private readonly windowMs = Number(process.env.RATE_LIMITER_HOTKEY_WINDOW_MS ?? 1000);

  private cleanupCursor = 0;

  private readonly idleTtlMs = Number(process.env.RATE_LIMITER_HOTKEY_IDLE_TTL_MS ?? 30_000);

  private readonly states = new Map<string, State>();

  constructor(private readonly clock: MonotonicClockService) {}

  record(key: string): number {
    const now = this.clock.nowMs();

    if ((now & 63) === 0) {
      this.cleanup(now);
    }

    let state = this.states.get(key);

    if (!state) {
      if (this.states.size >= this.maxEntries) {
        this.cleanup(now);
      }

      state = {
        count: 0,
        updatedAt: now,
      };

      if (this.states.size < this.maxEntries) {
        this.states.set(key, state);
      }
    }

    if (!state) {
      return 0;
    }

    if (now - state.updatedAt >= this.windowMs) {
      state.count = 0;
    }

    state.updatedAt = now;

    state.count += 1;

    return state.count;
  }

  shouldMitigate(count: number): boolean {
    return count >= this.mitigationThreshold;
  }

  probabilisticReject(key: string): boolean {
    return Probabilistic.percentage(key + ':' + Math.floor(this.clock.nowMs() / 1000), 25);
  }

  private cleanup(now: number): void {
    if (this.states.size === 0) {
      return;
    }

    const keys = Array.from(this.states.keys());

    const batchSize = Math.min(128, keys.length);

    for (let i = 0; i < batchSize; i += 1) {
      const idx = this.cleanupCursor % keys.length;

      this.cleanupCursor += 1;

      const key = keys[idx];

      if (!key) {
        return;
      }

      const state = this.states.get(key);

      if (!state) {
        continue;
      }

      if (now - state.updatedAt >= this.idleTtlMs) {
        this.states.delete(key);
      }
    }
  }
}

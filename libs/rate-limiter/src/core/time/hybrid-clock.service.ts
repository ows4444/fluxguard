import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

import { REDIS_CLIENT } from '../../module/tokens';

import type { RedisClient } from '../../redis/types';

import { MonotonicClockService } from './monotonic.time';

@Injectable()
export class HybridClockService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(HybridClockService.name);

  private readonly calibrationIntervalMs = Number(process.env.RATE_LIMITER_CLOCK_SYNC_INTERVAL_MS ?? 10000);

  private readonly maxAllowedDriftMs = Number(process.env.RATE_LIMITER_CLOCK_MAX_DRIFT_MS ?? 250);

  private offsetMs = 0;

  private lastCalibrationAt = 0;

  private timer?: NodeJS.Timeout;

  constructor(
    @Inject(REDIS_CLIENT)
    private readonly redis: RedisClient,

    private readonly monotonic: MonotonicClockService,
  ) {}

  onModuleInit(): void {
    void this.calibrate();

    this.timer = setInterval(() => {
      void this.calibrate();
    }, this.calibrationIntervalMs);

    this.timer.unref?.();
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  nowMs(): number {
    return this.monotonic.nowMs() + this.offsetMs;
  }

  ageMs(): number {
    return this.monotonic.nowMs() - this.lastCalibrationAt;
  }

  isStale(): boolean {
    return this.ageMs() > this.calibrationIntervalMs * 3;
  }

  private async calibrate(): Promise<void> {
    const localBefore = this.monotonic.nowMs();

    try {
      const result = await this.redis.time();

      const localAfter = this.monotonic.nowMs();

      const seconds = Number(result[0]);

      const microseconds = Number(result[1]);

      if (!Number.isFinite(seconds) || !Number.isFinite(microseconds)) {
        return;
      }

      const redisNow = seconds * 1000 + Math.floor(microseconds / 1000);

      const midpoint = Math.floor((localBefore + localAfter) / 2);

      const nextOffset = redisNow - midpoint;

      const drift = Math.abs(nextOffset - this.offsetMs);

      if (drift > this.maxAllowedDriftMs) {
        this.logger.warn(
          [
            'Redis clock drift exceeded threshold',
            `driftMs=${drift}`,
            `previousOffset=${this.offsetMs}`,
            `nextOffset=${nextOffset}`,
          ].join(' '),
        );
      }

      this.offsetMs = nextOffset;

      this.lastCalibrationAt = this.monotonic.nowMs();
    } catch (err) {
      this.logger.warn(
        ['Redis clock calibration failed', `error=${err instanceof Error ? err.name : 'UnknownError'}`].join(' '),
      );
    }
  }
}

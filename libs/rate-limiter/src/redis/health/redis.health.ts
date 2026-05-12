import { Inject, Injectable } from '@nestjs/common';
import { RATE_LIMITER_REDIS } from '../../module/tokens';
import type { RedisClient } from '../../redis/types';

@Injectable()
export class RedisHealthService {
  constructor(
    @Inject(RATE_LIMITER_REDIS)
    private readonly redis: RedisClient,
  ) {}

  async isHealthy(): Promise<boolean> {
    try {
      const res = await this.redis.ping();

      return res === 'PONG';
    } catch {
      return false;
    }
  }
}

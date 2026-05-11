import { Inject, Injectable } from '@nestjs/common';
import { REDIS_CLIENT } from '../../module/tokens';
import type { RedisClient } from '../../redis/types';

@Injectable()
export class RedisHealthService {
  constructor(
    @Inject(REDIS_CLIENT)
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

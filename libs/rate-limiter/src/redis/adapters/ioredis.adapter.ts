import { Injectable } from '@nestjs/common';
import type { Cluster, Redis } from 'ioredis';

import type { RedisAdapter } from '../contracts/redis.adapter';

@Injectable()
export class IORedisAdapter implements RedisAdapter {
  constructor(private readonly client: Redis | Cluster) {}

  async evalsha<T>(sha1: string, keys: readonly string[], args: readonly string[]): Promise<T> {
    return this.client.evalsha(sha1, keys.length, ...keys, ...args) as Promise<T>;
  }

  async scriptLoad(script: string): Promise<string> {
    return this.client.script('LOAD', script);
  }

  async time(): Promise<[string, string]> {
    return this.client.time();
  }

  async ping(): Promise<string> {
    return this.client.ping();
  }

  async shutdown(): Promise<void> {
    await this.client.quit();
  }
}

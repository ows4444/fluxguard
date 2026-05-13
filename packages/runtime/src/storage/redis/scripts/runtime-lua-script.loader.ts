import type { Redis } from 'ioredis';

export class RuntimeLuaScriptLoader {
  readonly #redis: Redis;

  readonly #cache = new Map<string, string>();

  constructor(redis: Redis) {
    this.#redis = redis;
  }

  async load(name: string, script: string): Promise<string> {
    const existing = this.#cache.get(name);

    if (existing) {
      return existing;
    }

    const sha = await this.#redis.script('LOAD', script);

    this.#cache.set(name, sha as string);

    return sha as string;
  }
}

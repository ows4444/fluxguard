import type { Redis } from 'ioredis';

export class RuntimeLuaScriptLoader {
  readonly #redis: Redis;

  readonly #cache = new Map<string, Promise<string>>();

  constructor(redis: Redis) {
    this.#redis = redis;
  }

  async load(name: string, script: string): Promise<string> {
    const existing = this.#cache.get(name);

    if (existing) {
      return existing;
    }

    const loading = this.#redis
      .script('LOAD', script)
      .then((sha) => sha as string)
      .catch((error) => {
        this.#cache.delete(name);
        throw error;
      });

    this.#cache.set(name, loading);

    return loading;
  }
}

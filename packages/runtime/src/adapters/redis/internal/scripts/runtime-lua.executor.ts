import type { Redis } from 'ioredis';

import { RuntimeStorageError } from '../../../../errors';
import type { LuaScriptDefinition } from './contracts/lua-script.interface';
import { RuntimeLuaScriptLoader } from './runtime-lua-script.loader';

export class RuntimeLuaExecutor {
  readonly #redis: Redis;

  readonly #loader: RuntimeLuaScriptLoader;

  constructor(redis: Redis) {
    this.#redis = redis;

    this.#loader = new RuntimeLuaScriptLoader(redis);
  }

  async execute<TResult>(
    definition: LuaScriptDefinition<TResult>,
    keys: string[],
    args: Array<string | number>,
    signal?: AbortSignal,
  ): Promise<TResult> {
    this.throwIfAborted(signal);
    const sha = await this.#loader.load(definition.name, definition.script);
    this.throwIfAborted(signal);

    try {
      const result = (await this.#redis.evalsha(sha, keys.length, ...keys, ...args.map(String))) as TResult;

      this.throwIfAborted(signal);

      return result;
    } catch (error) {
      if (error instanceof Error && error.message.includes('NOSCRIPT')) {
        this.#loader.invalidate(definition.name);

        const reloadedSha = await this.guardAbort(
          signal,
          async () => await this.#loader.load(definition.name, definition.script),
        );

        const result = (await this.#redis.evalsha(reloadedSha, keys.length, ...keys, ...args.map(String))) as TResult;

        this.throwIfAborted(signal);

        return result;
      }

      throw new RuntimeStorageError(`Lua execution failed: ${definition.name}`, {
        cause: error,
      });
    }
  }

  private async guardAbort<T>(signal: AbortSignal | undefined, operation: () => Promise<T>): Promise<T> {
    this.throwIfAborted(signal);

    const result = await operation();

    this.throwIfAborted(signal);

    return result;
  }

  private throwIfAborted(signal?: AbortSignal): void {
    if (signal?.aborted) {
      throw signal.reason instanceof Error ? signal.reason : new Error('Operation aborted');
    }
  }
}

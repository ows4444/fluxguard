import type { Redis } from 'ioredis';

import { RuntimeStorageError } from '../../../errors';
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
  ): Promise<TResult> {
    const sha = await this.#loader.load(definition.name, definition.script);

    try {
      return (await this.#redis.evalsha(sha, keys.length, ...keys, ...args.map(String))) as TResult;
    } catch (error) {
      if (error instanceof Error && error.message.includes('NOSCRIPT')) {
        await this.#redis.script('LOAD', definition.script);

        return (await this.#redis.eval(definition.script, keys.length, ...keys, ...args.map(String))) as TResult;
      }

      throw new RuntimeStorageError(`Lua execution failed: ${definition.name}`, {
        cause: error,
      });
    }
  }
}

import type { Redis } from 'ioredis';

export interface LuaScriptDefinition<TResult = unknown> {
  readonly name: string;

  readonly script: string;

  execute(redis: Redis, keys: string[], args: Array<string | number>): Promise<TResult>;
}

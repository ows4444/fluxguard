import type { Redis } from 'ioredis';

import { RuntimeLuaScriptLoader } from './runtime-lua-script.loader';
import { runtimeLuaScripts } from './runtime-script.registry';

export class RuntimeScriptPreloader {
  readonly #loader: RuntimeLuaScriptLoader;

  constructor(redis: Redis) {
    this.#loader = new RuntimeLuaScriptLoader(redis);
  }

  async preload(): Promise<void> {
    await Promise.all(runtimeLuaScripts.map((script) => this.#loader.load(script.name, script.script)));
  }
}

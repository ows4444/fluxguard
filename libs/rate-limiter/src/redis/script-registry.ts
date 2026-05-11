import { Injectable, Logger } from '@nestjs/common';

import { RedisClient } from '../redis/types';

import { readFileSync } from 'node:fs';

import { join } from 'node:path';

import { createHash } from 'node:crypto';

import { RedisExecutor } from './executor';

import {
  decodeBurstConsumeResponse,
  decodeBurstGetResponse,
  decodeCooldownGetResponse,
  decodeFixedWindowConsumeResponse,
  decodeFixedWindowGetResponse,
  decodeGcraConsumeResponse,
  decodeGcraPeekResponse,
  type BurstConsumeResponse,
  type BurstGetResponse,
  type CooldownGetResponse,
  type FixedWindowConsumeResponse,
  type FixedWindowGetResponse,
  type GcraConsumeResponse,
  type GcraPeekResponse,
} from './script-responses';

import { SCRIPT_CONTRACTS } from './script-contracts';
import { optionalProp } from '../core/utils/object.utils';

interface ScriptDefinition {
  readonly name: string;

  readonly source: string;

  readonly sha1: string;
}

interface EvalShaOptions {
  readonly redis: RedisClient;
  readonly script: ScriptDefinition;
  readonly keys: string[];
  readonly args: Array<string | number>;
  readonly signal?: AbortSignal;
}

@Injectable()
export class RedisScriptRegistry {
  private readonly logger = new Logger(RedisScriptRegistry.name);

  private readonly scripts = new Map<string, ScriptDefinition>();

  private readonly loadingPromises = new Map<string, Promise<void>>();

  private topologyWarmupPromise?: Promise<void>;

  private readonly clusterIds = new WeakMap<object, string>();

  constructor(private readonly executor: RedisExecutor) {
    this.registerBuiltIns();
  }

  async execute<T>(
    redis: RedisClient,
    scriptName: string,
    keys: string[],
    args: Array<string | number>,
    signal?: AbortSignal,
  ): Promise<T> {
    const contract = SCRIPT_CONTRACTS[scriptName];

    if (!contract) {
      throw new Error(`Missing Redis script contract "${scriptName}"`);
    }

    if (keys.length !== contract.keys) {
      throw new Error(`Redis script "${scriptName}" expected ${contract.keys} keys, received ${keys.length}`);
    }

    if (args.length !== contract.args) {
      throw new Error(`Redis script "${scriptName}" expected ${contract.args} args, received ${args.length}`);
    }

    const script = this.scripts.get(scriptName);

    if (!script) {
      throw new Error(`Unknown Redis script "${scriptName}"`);
    }

    try {
      return await this.evalSha<T>({
        redis,
        script,
        keys,
        args,
        ...optionalProp('signal', signal),
      });
    } catch (err) {
      if (!this.isNoScriptError(err)) {
        throw err;
      }

      await this.ensureLoaded(redis, script, signal);

      return this.evalSha<T>({
        redis,
        script,
        keys,
        args,
        ...optionalProp('signal', signal),
      });
    }
  }

  async executeFixedWindowConsume(
    redis: RedisClient,
    keys: string[],
    args: Array<string | number>,
    signal?: AbortSignal,
  ): Promise<FixedWindowConsumeResponse> {
    const response = await this.execute<unknown>(redis, 'fixed-window-consume', keys, args, signal);

    return decodeFixedWindowConsumeResponse(response);
  }

  async executeFixedWindowGet(
    redis: RedisClient,
    keys: string[],
    args: Array<string | number>,
  ): Promise<FixedWindowGetResponse> {
    const response = await this.execute<unknown>(redis, 'fixed-window-get', keys, args);

    return decodeFixedWindowGetResponse(response);
  }

  async executeBurstConsume(
    redis: RedisClient,
    keys: string[],
    args: Array<string | number>,
    signal?: AbortSignal,
  ): Promise<BurstConsumeResponse> {
    const response = await this.execute<unknown>(redis, 'burst-consume', keys, args, signal);

    return decodeBurstConsumeResponse(response);
  }

  async executeBurstGet(redis: RedisClient, keys: string[], args: Array<string | number>): Promise<BurstGetResponse> {
    const response = await this.execute<unknown>(redis, 'burst-get', keys, args);

    return decodeBurstGetResponse(response);
  }

  async executeGcraConsume(
    redis: RedisClient,
    keys: string[],
    args: Array<string | number>,
    signal?: AbortSignal,
  ): Promise<GcraConsumeResponse> {
    const response = await this.execute<unknown>(redis, 'gcra-consume', keys, args, signal);

    return decodeGcraConsumeResponse(response);
  }

  async executeGcraPeek(redis: RedisClient, keys: string[], args: Array<string | number>): Promise<GcraPeekResponse> {
    const response = await this.execute<unknown>(redis, 'gcra-peek', keys, args);

    return decodeGcraPeekResponse(response);
  }

  async executeCooldownGet(redis: RedisClient, keys: string[]): Promise<CooldownGetResponse> {
    const response = await this.execute<unknown>(redis, 'cooldown-get', keys, []);

    return decodeCooldownGetResponse(response);
  }

  async warmup(redis: RedisClient): Promise<void> {
    if (this.topologyWarmupPromise) {
      return this.topologyWarmupPromise;
    }

    this.topologyWarmupPromise = this.performWarmup(redis);

    try {
      await this.topologyWarmupPromise;
    } finally {
      this.topologyWarmupPromise = undefined;
    }
  }

  private async performWarmup(redis: RedisClient): Promise<void> {
    const nodes = 'nodes' in redis ? redis.nodes('master') : [redis];

    await Promise.all(
      nodes.flatMap((node) =>
        [...this.scripts.values()].map((script) =>
          this.ensureLoaded(node, script).catch((err) => {
            this.logger.warn(
              ['Redis script preload failed', `script=${script.name}`, `error=${String(err)}`].join(' '),
            );
          }),
        ),
      ),
    );
  }

  private async evalSha<T>({ redis, script, keys, args, signal }: EvalShaOptions): Promise<T> {
    return this.executor.execute<T>(
      `script:${script.name}`,
      `evalsha:${script.name}`,
      async () => redis.evalsha(script.sha1, keys.length, ...keys, ...args.map(String)) as Promise<T>,
      signal,
    );
  }

  private async ensureLoaded(redis: RedisClient, script: ScriptDefinition, signal?: AbortSignal): Promise<void> {
    const cacheKey = [this.resolveRedisInstanceKey(redis), script.sha1].join(':');

    const existing = this.loadingPromises.get(cacheKey);

    if (existing) {
      return existing;
    }

    const promise = this.load(redis, script);

    this.loadingPromises.set(cacheKey, promise);

    try {
      await promise;
    } finally {
      this.loadingPromises.delete(cacheKey);
    }
  }

  private resolveRedisInstanceKey(redis: RedisClient): string {
    if ('nodes' in redis) {
      let id = this.clusterIds.get(redis);

      if (!id) {
        const nodes = redis.nodes('master');

        id = nodes
          .map((n) => `${n.options.host}:${n.options.port}`)
          .sort()
          .join(',');

        this.clusterIds.set(redis, id);
      }

      return `cluster:${id}`;
    }

    const options = redis.options;

    return [options.host ?? 'unknown', options.port ?? '0', options.db ?? '0'].join(':');
  }

  private async load(redis: RedisClient, script: ScriptDefinition): Promise<void> {
    const sha = await this.executor.execute<string>(
      'script-loader',
      `redis.script.load.${script.name}`,
      async () => redis.script('LOAD', script.source) as Promise<string>,
    );

    if (sha !== script.sha1) {
      throw new Error(
        ['Redis SHA mismatch', `script=${script.name}`, `expected=${script.sha1}`, `actual=${sha}`].join(' '),
      );
    }
  }

  private registerBuiltIns(): void {
    this.registerScript('burst-consume', 'burst-consume.lua');

    this.registerScript('burst-get', 'burst-get.lua');

    this.registerScript('burst-adjust-idempotent', 'burst-adjust-idempotent.lua');

    this.registerScript('cooldown', 'cooldown.lua');

    this.registerScript('cooldown-get', 'cooldown-get.lua');

    this.registerScript('fixed-window-consume', 'fixed-window-consume.lua');

    this.registerScript('fixed-window-adjust-idempotent', 'fixed-window-adjust-idempotent.lua');

    this.registerScript('fixed-window-get', 'fixed-window-get.lua');

    this.registerScript('gcra-consume', 'gcra-consume.lua');

    this.registerScript('gcra-peek', 'gcra-peek.lua');
  }

  private registerScript(name: string, filename: string): void {
    const source = readFileSync(join(__dirname, 'scripts', 'lua', filename), 'utf8');

    const sha1 = createHash('sha1').update(source).digest('hex');

    this.scripts.set(name, { name, source, sha1 });
  }

  private isNoScriptError(err: unknown): boolean {
    return err instanceof Error && err.message.startsWith('NOSCRIPT');
  }
}

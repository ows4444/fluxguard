export interface RedisEvalOptions {
  readonly signal?: AbortSignal;
}

export interface RedisAdapter {
  evalsha<T>(sha1: string, keys: readonly string[], args: readonly string[], options?: RedisEvalOptions): Promise<T>;

  scriptLoad(script: string): Promise<string>;

  time(): Promise<[string, string]>;

  ping(): Promise<string>;

  warmup?(): Promise<void>;

  shutdown?(): Promise<void>;
}

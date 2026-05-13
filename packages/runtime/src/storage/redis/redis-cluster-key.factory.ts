export class RedisClusterKeyFactory {
  static scoped(base: string, suffix: string): string {
    return `{${base}}:${suffix}`;
  }
}

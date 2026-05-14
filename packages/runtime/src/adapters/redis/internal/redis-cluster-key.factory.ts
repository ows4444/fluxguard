export class RedisClusterKeyFactory {
  private static readonly VERSION = 'v1';

  static scoped(base: string, suffix: string): string {
    return `{fg:${this.VERSION}:${base}}:${suffix}`;
  }
}

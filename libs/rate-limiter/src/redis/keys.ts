export class RateLimitRedisKeys {
  private static readonly VERSION = 'v2';

  private static slot(name: string, identity: string): string {
    return `{rl:${this.VERSION}:${name}:${identity}}`;
  }

  static sustained(name: string, scope: string, identity: string): string {
    return `${this.slot(`${scope}:burst:${name}`, identity)}:sustained`;
  }

  static burst(name: string, scope: string, identity: string): string {
    return `${this.slot(`${scope}:burst:${name}`, identity)}:burst`;
  }

  static fixedWindow(name: string, scope: string, identity: string): string {
    return `${this.slot(`${scope}:fixed:${name}`, identity)}:counter`;
  }

  static gcra(name: string, scope: string, identity: string): string {
    return `${this.slot(`${scope}:gcra:${name}`, identity)}:tat`;
  }

  static cooldown(name: string, scope: string, identity: string): string {
    return `${this.slot(`${scope}:cooldown:${name}`, identity)}:lock`;
  }

  static progressiveBlock(name: string, scope: string, identity: string): string {
    return `${this.slot(`${scope}:progressive:${name}`, identity)}:block`;
  }

  static progressiveViolation(name: string, scope: string, identity: string): string {
    return `${this.slot(`${scope}:progressive:${name}`, identity)}:violations`;
  }

  static fixedWindowAdjustmentOperation(name: string, scope: string, identity: string, operationId: string): string {
    return `${this.slot(`${scope}:fixed:${name}`, identity)}:adj:${operationId}`;
  }

  static burstAdjustmentOperation(name: string, scope: string, identity: string, operationId: string): string {
    return `${this.slot(`${scope}:burst:${name}`, identity)}:adj:${operationId}`;
  }
}

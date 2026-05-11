import { RateLimitRedisKeys } from './keys';

export class AlgorithmRedisKeys {
  static fixedWindow(
    limiterName: string,
    scope: string,
    identity: string,
  ): {
    counter: string;
    progressiveBlock: string;
    progressiveViolation: string;
  } {
    return {
      counter: RateLimitRedisKeys.fixedWindow(limiterName, scope, identity),

      progressiveBlock: RateLimitRedisKeys.progressiveBlock(limiterName, scope, identity),

      progressiveViolation: RateLimitRedisKeys.progressiveViolation(limiterName, scope, identity),
    };
  }

  static fixedWindowAdjustment(
    limiterName: string,
    scope: string,
    identity: string,
    operationId: string,
  ): {
    counter: string;
    operation: string;
  } {
    return {
      counter: RateLimitRedisKeys.fixedWindow(limiterName, scope, identity),

      operation: RateLimitRedisKeys.fixedWindowAdjustmentOperation(limiterName, scope, identity, operationId),
    };
  }

  static burst(
    limiterName: string,
    scope: string,
    identity: string,
  ): {
    sustained: string;
    burst: string;
  } {
    return {
      sustained: RateLimitRedisKeys.sustained(limiterName, scope, identity),

      burst: RateLimitRedisKeys.burst(limiterName, scope, identity),
    };
  }

  static burstAdjustment(
    limiterName: string,
    scope: string,
    identity: string,
    operationId: string,
  ): {
    sustained: string;
    burst: string;
    operation: string;
  } {
    return {
      sustained: RateLimitRedisKeys.sustained(limiterName, scope, identity),

      burst: RateLimitRedisKeys.burst(limiterName, scope, identity),

      operation: RateLimitRedisKeys.burstAdjustmentOperation(limiterName, scope, identity, operationId),
    };
  }

  static gcra(limiterName: string, scope: string, identity: string): string {
    return RateLimitRedisKeys.gcra(limiterName, scope, identity);
  }

  static cooldown(limiterName: string, scope: string, identity: string): string {
    return RateLimitRedisKeys.cooldown(limiterName, scope, identity);
  }
}

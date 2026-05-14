import type {
  CooldownRateLimitConfig,
  GlobalRateLimitConfig,
  QuotaRateLimitConfig,
  RateLimitConfig,
  RateLimitKind,
} from '@fluxguard/contracts';

import type { RuntimeLimiterConfig, RuntimeProgressiveBlockingPolicy } from '../../config';
import type { RuntimeLimiterDefinition } from '../../core';
import { RuntimeConfigurationError } from '../../errors';

export class RuntimeDefinitionCompiler {
  private static readonly MAX_POINTS = 1_000_000;

  private static readonly MAX_DURATION_SECONDS = 86_400;

  private static readonly MAX_KEY_SEGMENTS = 3;

  private static readonly MAX_BURST_MULTIPLIER = 10;

  private static readonly VALID_SEGMENTS = new Set(['ip', 'userId', 'deviceId']);

  compile(name: string, config: RateLimitConfig): RuntimeLimiterDefinition {
    this.validate(name, config);

    const progressiveBlocking = this.compileProgressiveBlocking(config);

    const blocking =
      config.kind === 'quota'
        ? {
            blockDurationSeconds: config.blockDuration ?? 0,

            multiplier: config.blockMultiplier ?? 1,

            maxBlockDurationSeconds: 3600,
          }
        : undefined;

    return {
      name,

      config,

      compiled: {
        kind: config.kind,

        runtime: this.compileRuntime(config),

        ...(blocking
          ? {
              blocking,
            }
          : {}),

        ...(progressiveBlocking
          ? {
              progressiveBlocking,
            }
          : {}),
      },

      descriptor: {
        execution: {
          enabled: config.enabled ?? true,

          priority: config.priority ?? 0,

          timeoutMs: config.executionTimeoutMs ?? 1000,

          ...(config.concurrencyGroup
            ? {
                concurrencyGroup: config.concurrencyGroup,
              }
            : {}),

          scopeKind: config.kind === 'global' ? 'global' : 'route',

          limiterKind: config.kind,
        },

        resilience: {
          critical: config.critical ?? false,

          ...(config.failBehavior
            ? {
                failBehavior: config.failBehavior,
              }
            : {}),

          degradedAllowancePerSecond: config.degradedAllowancePerSecond ?? 0,
        },

        exposure: {
          exposeInHeaders: config.exposeInHeaders ?? true,

          ...(config.message
            ? {
                message: config.message,
              }
            : {}),

          ...(config.errorCode
            ? {
                errorCode: config.errorCode,
              }
            : {}),
        },

        identity: {
          keySegments: config.keySegments ?? ['ip'],

          ignoreKeyOverride: config.ignoreKeyOverride ?? false,

          allowKeyOverride: config.allowKeyOverride ?? false,
        },

        adjustment: {
          allowManualAdjustments: config.allowManualAdjustments ?? false,
        },
      },
    };
  }

  private validate(name: string, config: RateLimitConfig): void {
    this.validateDuration(name, config.duration);

    this.validatePriority(name, config.priority);

    this.validateDegradedAllowance(name, config.degradedAllowancePerSecond);

    this.validateFailBehavior(name, config.failBehavior);

    this.validateAllowKeyOverride(name, config.allowKeyOverride);

    this.validateKeySegments(name, config.keySegments);

    this.validateBlockDuration(name, config.kind === 'quota' ? config.blockDuration : undefined);

    this.validateBlockMultiplier(name, config.kind === 'quota' ? config.blockMultiplier : undefined);

    this.validateBurst(name, config.kind, config);

    this.validateProgressiveBlocking(name, config);

    if (config.kind !== 'cooldown') {
      this.validatePoints(name, config.points);
    }
  }

  private validatePoints(name: string, points: number): void {
    if (!Number.isInteger(points) || points <= 0) {
      throw new RuntimeConfigurationError(`Limiter "${name}": points must be a positive integer`);
    }

    if (points > RuntimeDefinitionCompiler.MAX_POINTS) {
      throw new RuntimeConfigurationError(`Limiter "${name}": points exceeds maximum`);
    }
  }

  private validateDuration(name: string, duration: number): void {
    if (!Number.isInteger(duration) || duration <= 0) {
      throw new RuntimeConfigurationError(`Limiter "${name}": duration must be a positive integer`);
    }

    if (duration > RuntimeDefinitionCompiler.MAX_DURATION_SECONDS) {
      throw new RuntimeConfigurationError(`Limiter "${name}": duration exceeds maximum`);
    }
  }

  private validatePriority(name: string, priority?: number): void {
    if (priority === undefined) {
      return;
    }

    if (!Number.isInteger(priority) || priority < 0) {
      throw new RuntimeConfigurationError(`Limiter "${name}": priority must be >= 0`);
    }
  }

  private validateBlockDuration(name: string, duration?: number): void {
    if (duration === undefined) {
      return;
    }

    if (!Number.isInteger(duration) || duration < 0) {
      throw new RuntimeConfigurationError(`Limiter "${name}": blockDuration must be >= 0`);
    }

    if (duration > RuntimeDefinitionCompiler.MAX_DURATION_SECONDS) {
      throw new RuntimeConfigurationError(`Limiter "${name}": blockDuration exceeds maximum`);
    }
  }

  private validateFailBehavior(name: string, behavior?: string): void {
    if (behavior && behavior !== 'open' && behavior !== 'closed') {
      throw new RuntimeConfigurationError(`Limiter "${name}": invalid failBehavior`);
    }
  }

  private validateAllowKeyOverride(name: string, value?: boolean): void {
    if (value === undefined) {
      return;
    }

    if (typeof value !== 'boolean') {
      throw new RuntimeConfigurationError(`Limiter "${name}": allowKeyOverride must be boolean`);
    }
  }

  private validateKeySegments(name: string, keySegments?: string[]): void {
    if (!keySegments) {
      return;
    }

    if (keySegments.length > RuntimeDefinitionCompiler.MAX_KEY_SEGMENTS) {
      throw new RuntimeConfigurationError(`Limiter "${name}": too many key segments configured`);
    }

    for (const segment of keySegments) {
      if (!RuntimeDefinitionCompiler.VALID_SEGMENTS.has(segment)) {
        throw new RuntimeConfigurationError(`Limiter "${name}": invalid key segment "${segment}"`);
      }
    }
  }

  private validateBurst(name: string, kind: RateLimitKind, config: RateLimitConfig): void {
    if (!config.burst) {
      if (config.algorithm === 'burst') {
        throw new RuntimeConfigurationError(`Limiter "${name}": burst algorithm requires burst config`);
      }

      return;
    }

    if (kind !== 'quota') {
      throw new RuntimeConfigurationError(`Limiter "${name}": burst config only supported for quota limiters`);
    }

    if (config.algorithm !== 'burst') {
      throw new RuntimeConfigurationError(`Limiter "${name}": burst config requires burst algorithm`);
    }

    const { burstPoints, burstDuration } = config.burst;

    if (!Number.isInteger(burstPoints) || burstPoints <= 0) {
      throw new RuntimeConfigurationError(`Limiter "${name}": burstPoints must be positive integer`);
    }

    if (!Number.isInteger(burstDuration) || burstDuration <= 0) {
      throw new RuntimeConfigurationError(`Limiter "${name}": burstDuration must be positive integer`);
    }

    if (kind === 'quota' && burstPoints > config.points * RuntimeDefinitionCompiler.MAX_BURST_MULTIPLIER) {
      throw new RuntimeConfigurationError(`Limiter "${name}": burstPoints excessively exceeds sustained points`);
    }
  }

  private validateBlockMultiplier(name: string, multiplier?: number): void {
    if (multiplier === undefined) {
      return;
    }

    if (!Number.isFinite(multiplier) || multiplier <= 1) {
      throw new RuntimeConfigurationError(`Limiter "${name}": blockMultiplier must be > 1`);
    }

    if (multiplier > 100) {
      throw new RuntimeConfigurationError(`Limiter "${name}": blockMultiplier too large`);
    }
  }

  private validateDegradedAllowance(name: string, allowance?: number): void {
    if (allowance === undefined) {
      return;
    }

    if (!Number.isInteger(allowance) || allowance <= 0) {
      throw new RuntimeConfigurationError(`Limiter "${name}": degradedAllowancePerSecond must be positive integer`);
    }

    if (allowance > 10_000) {
      throw new RuntimeConfigurationError(`Limiter "${name}": degradedAllowancePerSecond too large`);
    }
  }

  private compileRuntime(config: RateLimitConfig): RuntimeLimiterConfig {
    switch (config.kind) {
      case 'quota':
        return this.compileQuotaRuntime(config);

      case 'global':
        return this.compileGlobalRuntime(config);

      case 'cooldown':
        return this.compileCooldownRuntime(config);
    }
  }
  private validateProgressiveBlocking(name: string, config: RateLimitConfig): void {
    if (config.kind !== 'quota' || !config.progressiveBlocking?.enabled) {
      return;
    }

    const policy = config.progressiveBlocking;

    if (!Number.isInteger(policy.initialBlockSeconds) || policy.initialBlockSeconds <= 0) {
      throw new RuntimeConfigurationError(`Limiter "${name}": progressiveBlocking.initialBlockSeconds invalid`);
    }

    if (!Number.isFinite(policy.multiplier) || policy.multiplier <= 1) {
      throw new RuntimeConfigurationError(`Limiter "${name}": progressiveBlocking.multiplier invalid`);
    }

    if (!Number.isInteger(policy.maxBlockSeconds) || policy.maxBlockSeconds <= 0) {
      throw new RuntimeConfigurationError(`Limiter "${name}": progressiveBlocking.maxBlockSeconds invalid`);
    }

    if (!Number.isInteger(policy.violationTtlSeconds) || policy.violationTtlSeconds <= 0) {
      throw new RuntimeConfigurationError(`Limiter "${name}": progressiveBlocking.violationTtlSeconds invalid`);
    }

    if (policy.initialBlockSeconds > policy.maxBlockSeconds) {
      throw new RuntimeConfigurationError(`Limiter "${name}": initialBlockSeconds cannot exceed maxBlockSeconds`);
    }
  }

  private compileQuotaRuntime(config: QuotaRateLimitConfig): RuntimeLimiterConfig {
    switch (config.algorithm ?? 'fixed') {
      case 'fixed':
        return {
          algorithm: 'fixed',
          limit: config.points,
          durationMs: config.duration * 1000,
        };

      case 'gcra':
        return {
          algorithm: 'gcra',
          emissionIntervalMs: Math.floor((config.duration * 1000) / config.points),
          burstCapacity: config.burst?.burstPoints ?? config.points,
        };

      case 'burst':
        return {
          algorithm: 'burst',
          limit: config.points,
          sustainedDurationMs: config.duration * 1000,
          burstCapacity: config.burst?.burstPoints ?? config.points,
          burstWindowMs: (config.burst?.burstDuration ?? config.duration) * 1000,
        };
    }
  }

  private compileGlobalRuntime(config: GlobalRateLimitConfig): RuntimeLimiterConfig {
    return {
      algorithm: 'fixed',
      limit: config.points,
      durationMs: config.duration * 1000,
    };
  }

  private compileCooldownRuntime(config: CooldownRateLimitConfig): RuntimeLimiterConfig {
    return {
      algorithm: 'cooldown',
      durationMs: config.duration * 1000,
    };
  }

  private compileProgressiveBlocking(config: RateLimitConfig): RuntimeProgressiveBlockingPolicy | undefined {
    if (config.kind !== 'quota') {
      return undefined;
    }

    if (!config.progressiveBlocking?.enabled) {
      return undefined;
    }

    return {
      enabled: true,
      initialBlockSeconds: config.progressiveBlocking.initialBlockSeconds,
      multiplier: config.progressiveBlocking.multiplier,
      maxBlockSeconds: config.progressiveBlocking.maxBlockSeconds,
      violationTtlSeconds: config.progressiveBlocking.violationTtlSeconds,
    };
  }
}

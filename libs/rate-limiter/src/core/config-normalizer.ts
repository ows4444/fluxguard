import { RateLimiterConfigurationError } from '../errors/rate-limiter.errors';
import type {
  RuntimeLimiterConfig,
  RuntimeIdentityPolicy,
  CooldownRateLimitConfig,
  GlobalRateLimitConfig,
  QuotaRateLimitConfig,
  ProgressiveBlockingConfig,
} from '../module/rate-limiter.interfaces';

import type { RateLimitConfig } from '../module/rate-limiter.interfaces';
import { RateLimitKind } from '../module/rate-limiter.types';
import { RuntimeSnapshot } from './runtime/runtime-snapshot';
import { deepFreeze } from './utils/deep-freeze';
import { optionalProp } from './utils/object.utils';

export class RateLimiterCompiler {
  private static readonly MAX_POINTS = 1_000_000;

  private static readonly MAX_DURATION_SECONDS = 86_400;

  private static readonly MAX_BURST_MULTIPLIER = 10;

  private static readonly MAX_KEY_SEGMENTS = 3;

  private static readonly VALID_SEGMENTS = new Set(['ip', 'userId', 'deviceId']);

  static compile(name: string, config: RateLimitConfig, _scope: string): RuntimeSnapshot {
    const kind: RateLimitKind = config.kind ?? 'quota';

    this.validateName(name);

    if (!this.isCooldown(config)) {
      this.validatePoints(name, config.points);
    }

    this.validateDuration(name, config.duration);

    this.validatePriority(name, config.priority);

    if (kind === 'quota') {
      this.validateBlockDuration(name, config.blockDuration);
    }

    this.validateFailBehavior(name, config.failBehavior);

    this.validateAllowKeyOverride(name, config.allowKeyOverride);

    this.validateKeySegments(name, config.keySegments);

    this.validateBurst(name, kind, config);

    this.validateBlockMultiplier(name, config.blockMultiplier);

    this.validateDegradedAllowance(name, config.degradedAllowancePerSecond);

    this.validateProgressiveBlocking(name, config);

    const normalizedKeySegments = Object.freeze([...new Set(config.keySegments ?? ['ip'])].sort()) as ReadonlyArray<
      'ip' | 'userId' | 'deviceId'
    >;

    const execution = Object.freeze({
      enabled: config.enabled !== false,

      priority: config.priority ?? (kind === 'global' ? 0 : kind === 'cooldown' ? 10 : 100),

      timeoutMs: Math.max(10, Math.min(config.executionTimeoutMs ?? 75, 500)),

      scopeKind: kind === 'global' ? 'global' : 'route',

      limiterKind: kind,

      ...optionalProp('concurrencyGroup', config.concurrencyGroup),
    });

    const resilience = Object.freeze({
      critical: config.critical === true,

      ...optionalProp('failBehavior', config.failBehavior),

      degradedAllowancePerSecond: Math.max(1, Math.floor(config.degradedAllowancePerSecond ?? 10)),
    });

    const exposure: RuntimeSnapshot['exposure'] = {
      exposeInHeaders: config.exposeInHeaders !== false,
      ...(config.message !== undefined ? { message: config.message } : {}),
      ...(config.errorCode !== undefined ? { errorCode: config.errorCode } : {}),
    };

    Object.freeze(exposure);

    const adjustments = Object.freeze({
      allowManualAdjustments: config.allowManualAdjustments === true,
    });

    const identity: RuntimeIdentityPolicy = Object.freeze({
      keySegments: normalizedKeySegments,
      ignoreKeyOverride: config.ignoreKeyOverride ?? false,
      allowKeyOverride: config.allowKeyOverride ?? true,
    });

    const blocking =
      kind === 'quota' && config.blockDuration
        ? Object.freeze({
            blockDurationSeconds: config.blockDuration,
            multiplier: config.blockMultiplier ?? 1,

            maxBlockDurationSeconds: Math.min(
              86_400,
              Math.max(
                config.blockDuration,
                Math.ceil(config.blockDuration * Math.pow(config.blockMultiplier ?? 1, 6)),
              ),
            ),
          })
        : undefined;

    const progressiveBlockingConfig = this.getProgressiveBlockingConfig(config);

    const progressiveBlocking = progressiveBlockingConfig
      ? Object.freeze({
          enabled: progressiveBlockingConfig.enabled !== false,
          initialBlockSeconds: progressiveBlockingConfig.initialBlockSeconds,
          multiplier: progressiveBlockingConfig.multiplier,
          maxBlockSeconds: progressiveBlockingConfig.maxBlockSeconds,
          violationTtlSeconds: progressiveBlockingConfig.violationTtlSeconds,
        })
      : undefined;

    let runtime: RuntimeLimiterConfig;

    if (this.isCooldown(config)) {
      runtime = Object.freeze({
        algorithm: 'cooldown',
        durationMs: config.duration * 1000,
      });
    } else if (this.isQuota(config) && (config.algorithm ?? 'gcra') === 'fixed') {
      runtime = Object.freeze({
        algorithm: 'fixed',
        limit: config.points,
        durationMs: config.duration * 1000,
      });
    } else if (this.isQuota(config) && (config.algorithm ?? 'gcra') === 'burst') {
      runtime = Object.freeze({
        algorithm: 'burst',
        limit: config.points,
        sustainedDurationMs: config.duration * 1000,
        burstCapacity: config.burst!.burstPoints,
        burstWindowMs: config.burst!.burstDuration * 1000,
      });
    } else if (this.isQuota(config) || this.isGlobal(config)) {
      runtime = Object.freeze({
        algorithm: 'gcra',
        emissionIntervalMs: Math.ceil((config.duration * 1000) / config.points),
        burstCapacity: config.points,
      });
    } else {
      throw new RateLimiterConfigurationError(`Limiter "${name}": unsupported configuration`);
    }

    return deepFreeze({
      runtime,
      execution,
      resilience,
      exposure,
      adjustments,
      identity,
      ...(blocking !== undefined ? { blocking } : {}),
      ...(progressiveBlocking !== undefined ? { progressiveBlocking } : {}),
    });
  }

  private static isCooldown(config: RateLimitConfig): config is CooldownRateLimitConfig {
    return config.kind === 'cooldown';
  }

  private static isGlobal(config: RateLimitConfig): config is GlobalRateLimitConfig {
    return config.kind === 'global';
  }

  private static isQuota(config: RateLimitConfig): config is QuotaRateLimitConfig {
    return config.kind === undefined || config.kind === 'quota';
  }

  private static getProgressiveBlockingConfig(config: RateLimitConfig): ProgressiveBlockingConfig | undefined {
    if (!this.isQuota(config)) {
      return undefined;
    }

    return config.progressiveBlocking;
  }

  private static validateName(name: string): void {
    if (name.trim().length === 0) {
      throw new RateLimiterConfigurationError('Limiter name cannot be empty');
    }

    if (name.length > 128) {
      throw new RateLimiterConfigurationError(`Limiter "${name}": name too long`);
    }
  }

  private static validatePoints(name: string, points: number): void {
    if (!Number.isInteger(points) || points <= 0) {
      throw new RateLimiterConfigurationError(`Limiter "${name}": points must be a positive integer`);
    }

    if (points > this.MAX_POINTS) {
      throw new RateLimiterConfigurationError(`Limiter "${name}": points exceeds maximum`);
    }
  }

  private static validateDuration(name: string, duration: number): void {
    if (!Number.isInteger(duration) || duration <= 0) {
      throw new RateLimiterConfigurationError(`Limiter "${name}": duration must be a positive integer`);
    }

    if (duration > this.MAX_DURATION_SECONDS) {
      throw new RateLimiterConfigurationError(`Limiter "${name}": duration exceeds maximum`);
    }
  }

  private static validatePriority(name: string, priority?: number): void {
    if (priority === undefined) {
      return;
    }

    if (!Number.isInteger(priority) || priority < 0) {
      throw new RateLimiterConfigurationError(`Limiter "${name}": priority must be >= 0`);
    }
  }

  private static validateBlockDuration(name: string, duration?: number): void {
    if (duration === undefined) {
      return;
    }

    if (!Number.isInteger(duration) || duration < 0) {
      throw new RateLimiterConfigurationError(`Limiter "${name}": blockDuration must be >= 0`);
    }

    if (duration > this.MAX_DURATION_SECONDS) {
      throw new RateLimiterConfigurationError(`Limiter "${name}": blockDuration exceeds maximum`);
    }
  }

  private static validateFailBehavior(name: string, behavior?: string): void {
    if (behavior && behavior !== 'open' && behavior !== 'closed') {
      throw new RateLimiterConfigurationError(`Limiter "${name}": invalid failBehavior`);
    }
  }

  private static validateAllowKeyOverride(name: string, value?: boolean): void {
    if (value === undefined) {
      return;
    }

    if (typeof value !== 'boolean') {
      throw new RateLimiterConfigurationError(`Limiter "${name}": allowKeyOverride must be boolean`);
    }
  }

  private static validateKeySegments(name: string, keySegments?: string[]): void {
    if (!keySegments) {
      return;
    }

    if (!Array.isArray(keySegments)) {
      throw new RateLimiterConfigurationError(`Limiter "${name}": keySegments must be an array`);
    }

    if (keySegments.length > this.MAX_KEY_SEGMENTS) {
      throw new RateLimiterConfigurationError(`Limiter "${name}": too many key segments configured`);
    }

    for (const segment of keySegments) {
      if (!this.VALID_SEGMENTS.has(segment)) {
        throw new RateLimiterConfigurationError(`Limiter "${name}": invalid key segment "${segment}"`);
      }
    }
  }

  private static validateBurst(name: string, kind: RateLimitKind, config: RateLimitConfig): void {
    if (!config.burst) {
      if (config.algorithm === 'burst') {
        throw new RateLimiterConfigurationError(`Limiter "${name}": burst algorithm requires burst config`);
      }

      return;
    }

    if (kind !== 'quota') {
      throw new RateLimiterConfigurationError(`Limiter "${name}": burst config only supported for quota limiters`);
    }

    if (config.algorithm !== 'burst') {
      throw new RateLimiterConfigurationError(`Limiter "${name}": burst config requires burst algorithm`);
    }

    const { burstPoints, burstDuration } = config.burst;

    if (!Number.isInteger(burstPoints) || burstPoints <= 0) {
      throw new RateLimiterConfigurationError(`Limiter "${name}": burstPoints must be positive integer`);
    }

    if (!Number.isInteger(burstDuration) || burstDuration <= 0) {
      throw new RateLimiterConfigurationError(`Limiter "${name}": burstDuration must be positive integer`);
    }

    if (burstPoints > config.points * this.MAX_BURST_MULTIPLIER) {
      throw new RateLimiterConfigurationError(`Limiter "${name}": burstPoints excessively exceeds sustained points`);
    }
  }

  private static validateBlockMultiplier(name: string, multiplier?: number): void {
    if (multiplier === undefined) {
      return;
    }

    if (!Number.isFinite(multiplier) || multiplier <= 1) {
      throw new RateLimiterConfigurationError(`Limiter "${name}": blockMultiplier must be > 1`);
    }

    if (multiplier > 100) {
      throw new RateLimiterConfigurationError(`Limiter "${name}": blockMultiplier too large`);
    }
  }

  private static validateDegradedAllowance(name: string, allowance?: number): void {
    if (allowance === undefined) {
      return;
    }

    if (!Number.isInteger(allowance) || allowance <= 0) {
      throw new RateLimiterConfigurationError(`Limiter "${name}": degradedAllowancePerSecond must be positive integer`);
    }

    if (allowance > 10_000) {
      throw new RateLimiterConfigurationError(`Limiter "${name}": degradedAllowancePerSecond too large`);
    }
  }

  private static validateProgressiveBlocking(name: string, config: RateLimitConfig): void {
    if (!this.isQuota(config) || !config.progressiveBlocking) {
      return;
    }

    const p = config.progressiveBlocking;

    if (!Number.isInteger(p.initialBlockSeconds) || p.initialBlockSeconds <= 0) {
      throw new RateLimiterConfigurationError(`Limiter "${name}": progressiveBlocking.initialBlockSeconds invalid`);
    }

    if (!Number.isFinite(p.multiplier) || p.multiplier <= 1) {
      throw new RateLimiterConfigurationError(`Limiter "${name}": progressiveBlocking.multiplier invalid`);
    }

    if (!Number.isInteger(p.maxBlockSeconds) || p.maxBlockSeconds <= 0) {
      throw new RateLimiterConfigurationError(`Limiter "${name}": progressiveBlocking.maxBlockSeconds invalid`);
    }

    if (!Number.isInteger(p.violationTtlSeconds) || p.violationTtlSeconds <= 0) {
      throw new RateLimiterConfigurationError(`Limiter "${name}": progressiveBlocking.violationTtlSeconds invalid`);
    }

    if (p.maxBlockSeconds < p.initialBlockSeconds) {
      throw new RateLimiterConfigurationError(
        `Limiter "${name}": progressiveBlocking.maxBlockSeconds must be >= initialBlockSeconds`,
      );
    }
  }
}

import type {
  CooldownRateLimitConfig,
  GlobalRateLimitConfig,
  QuotaRateLimitConfig,
  RateLimitConfig,
} from '@fluxguard/contracts';

import type { RuntimeLimiterConfig, RuntimeProgressiveBlockingPolicy } from '../config/index';
import type { RuntimeLimiterDefinition } from '../core/index';

export class RuntimeDefinitionCompiler {
  compile(name: string, config: RateLimitConfig): RuntimeLimiterDefinition {
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

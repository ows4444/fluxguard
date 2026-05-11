import { createHash } from 'node:crypto';
import { RateLimiterConfigurationError } from '../errors/rate-limiter.errors';
import type { RateLimitContext } from '../module/rate-limiter.interfaces';

interface KeyBuilderConfig {
  keySegments: readonly ('ip' | 'userId' | 'deviceId')[];

  ignoreKeyOverride: boolean;

  allowKeyOverride?: boolean;
}

export class RateLimitKeyBuilder {
  static build(limiterName: string, context: RateLimitContext, config: KeyBuilderConfig): string {
    const parts = ['v3', limiterName];

    let hasIdentity = false;

    for (const segment of config.keySegments) {
      const value = context[segment];

      if (!value) {
        continue;
      }

      hasIdentity = true;

      parts.push(`${segment}:${value}`);
    }

    if (config.allowKeyOverride !== false && !config.ignoreKeyOverride && context.keyOverride) {
      hasIdentity = true;
      parts.push(`override:${context.keyOverride}`);
    }

    if (!hasIdentity) {
      throw new RateLimiterConfigurationError(`Limiter "${limiterName}" resolved no usable identity segments`);
    }

    return createHash('sha256').update(parts.join('|')).digest('hex').slice(0, 24);
  }
}

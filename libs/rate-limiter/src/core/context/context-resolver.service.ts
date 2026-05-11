import { Injectable, Logger } from '@nestjs/common';

import type { Request } from 'express';

import type { RateLimitContext, RateLimiterModuleOptions } from '../../module/rate-limiter.interfaces';

@Injectable()
export class ContextResolverService {
  private readonly logger = new Logger(ContextResolverService.name);

  private static readonly MAX_VALUE_LENGTH = 128;

  private static readonly MAX_EXTRA_FIELDS = 16;

  private static readonly KEY_PATTERN = /^[a-zA-Z0-9:_-]+$/;

  private static readonly VALUE_PATTERN = /^[a-zA-Z0-9:._@#|-]+$/;

  private static readonly RESERVED_KEYS = new Set(['ip', 'userId', 'deviceId', 'keyOverride']);

  async resolve(
    req: Request,
    base: RateLimitContext,
    globalResolver?: RateLimiterModuleOptions['contextResolver'],
    routeResolver?: (req: Request) => Partial<RateLimitContext> | Promise<Partial<RateLimitContext>>,
  ): Promise<RateLimitContext> {
    const globalCtx = globalResolver ? await Promise.resolve(globalResolver(req)) : {};

    const routeCtx = routeResolver ? await Promise.resolve(routeResolver(req)) : {};

    return this.normalize({
      ...base,
      ...globalCtx,
      ...routeCtx,
    });
  }

  private normalize(ctx: RateLimitContext): RateLimitContext {
    const normalized: RateLimitContext = {};

    let extraFieldCount = 0;

    const entries = Object.entries(ctx);

    for (const [rawKey, rawValue] of entries) {
      if (typeof rawKey !== 'string' || typeof rawValue !== 'string') {
        continue;
      }

      const key = rawKey.trim();

      if (key.length === 0) {
        continue;
      }

      if (!ContextResolverService.KEY_PATTERN.test(key)) {
        this.logger.debug(`Dropped invalid context key "${key}"`);
        continue;
      }

      if (ContextResolverService.RESERVED_KEYS.has(key) && normalized[key] !== undefined) {
        continue;
      }

      const value = this.normalizeValue(rawValue);

      if (!value) {
        this.logger.debug(`Dropped invalid context value for key "${key}"`);
        continue;
      }

      if (!ContextResolverService.RESERVED_KEYS.has(key)) {
        extraFieldCount += 1;

        if (extraFieldCount > ContextResolverService.MAX_EXTRA_FIELDS) {
          continue;
        }
      }

      normalized[key] = value;
    }

    return normalized;
  }

  private normalizeValue(value: string): string | undefined {
    const normalized = value.trim().slice(0, ContextResolverService.MAX_VALUE_LENGTH);

    if (normalized.length === 0) {
      return undefined;
    }

    if (!ContextResolverService.VALUE_PATTERN.test(normalized)) {
      return undefined;
    }

    return normalized;
  }
}

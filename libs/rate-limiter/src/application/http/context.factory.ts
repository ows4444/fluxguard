import { Injectable } from '@nestjs/common';
import { Request } from 'express';
import { RateLimitIdentity } from '../../core/identity';
import { RateLimitContext } from '../../module/rate-limiter.interfaces';
import { RateLimitIp } from '../../core/identity/ip';
import { optionalProp } from '../../core/utils/object.utils';

@Injectable()
export class RateLimitContextFactory {
  create(req: Request, override?: string): RateLimitContext {
    const deviceId = this.normalizeHeaderValue(req.headers['x-device-id']);

    return {
      ip: RateLimitIp.resolve(req),

      ...optionalProp('userId', this.resolveUserId(req)),

      ...optionalProp('deviceId', deviceId),

      ...optionalProp('keyOverride', override ? RateLimitIdentity.normalizeOverride(override) : undefined),
    };
  }

  private normalizeHeaderValue(value: unknown): string | undefined {
    if (typeof value !== 'string') {
      return undefined;
    }

    const normalized = value.trim();

    if (normalized.length === 0) {
      return undefined;
    }

    return normalized.slice(0, 128);
  }

  private resolveUserId(req: Request): string | undefined {
    const candidate = (
      req as Request & {
        user?: { id?: unknown };
      }
    ).user;

    if (!candidate) {
      return undefined;
    }

    if (typeof candidate.id !== 'string') {
      return undefined;
    }

    const normalized = candidate.id.trim();

    if (normalized.length === 0) {
      return undefined;
    }

    return normalized.slice(0, 128);
  }
}

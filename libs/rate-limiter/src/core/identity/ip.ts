import type { Request } from 'express';

export class RateLimitIp {
  private static readonly MAX_LENGTH = 64;

  static resolve(req: Request): string {
    const candidate = req.ip ?? req.socket.remoteAddress ?? 'unknown';

    return this.normalize(candidate);
  }

  private static normalize(value: string): string {
    return value.trim().toLowerCase().slice(0, this.MAX_LENGTH);
  }
}

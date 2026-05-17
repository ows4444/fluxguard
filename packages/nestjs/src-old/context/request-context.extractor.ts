import type { RateLimitContext } from '@fluxguard/contracts';
import type { ExecutionContext } from '@nestjs/common';

interface HttpRequestLike {
  ip?: string;

  user?: {
    id?: string;
  };

  headers: Record<string, string | string[] | undefined>;
}

export class RequestContextExtractor {
  extract(context: ExecutionContext): RateLimitContext {
    const request = context.switchToHttp().getRequest<HttpRequestLike>();

    const deviceHeader = request.headers['x-device-id'];

    return {
      ...(request.ip ? { ip: request.ip } : {}),
      ...(request.user?.id ? { userId: request.user.id } : {}),
      ...(typeof deviceHeader === 'string' ? { deviceId: deviceHeader } : {}),
    };
  }
}

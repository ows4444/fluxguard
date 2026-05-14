import { DecisionOutcome } from '@fluxguard/contracts';
import { RuntimeEngine } from '@fluxguard/runtime';
import { type CanActivate, type ExecutionContext, HttpException, Inject, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { FLUXGUARD_CONTEXT_EXTRACTOR, FLUXGUARD_RUNTIME } from '../constants/injection-tokens';
import type { RequestContextExtractor } from '../context/request-context.extractor';
import { RATE_LIMIT_METADATA_KEY } from '../decorators/rate-limit.decorator';

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    @Inject(FLUXGUARD_RUNTIME)
    private readonly runtime: RuntimeEngine,

    @Inject(FLUXGUARD_CONTEXT_EXTRACTOR)
    private readonly extractor: RequestContextExtractor,

    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const metadata = this.reflector.getAllAndOverride<string | { name: string }>(RATE_LIMIT_METADATA_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!metadata) {
      return true;
    }

    const limiterName = typeof metadata === 'string' ? metadata : metadata.name;

    const rateLimitContext = this.extractor.extract(context);

    const result = await this.runtime.consume(limiterName, rateLimitContext);

    if (
      result.outcome === DecisionOutcome.REJECTED ||
      result.outcome === DecisionOutcome.BLOCKED ||
      result.outcome === DecisionOutcome.DEGRADED_REJECTED
    ) {
      throw new HttpException({ retryAfter: result.msBeforeNext }, 429);
    }

    return true;
  }
}

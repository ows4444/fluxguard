import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  InternalServerErrorException,
  ServiceUnavailableException,
} from '@nestjs/common';

import { Reflector } from '@nestjs/core';

import type { Request, Response } from 'express';

import {
  RATE_LIMIT_CONTEXT_RESOLVER,
  RATE_LIMIT_KEY_OVERRIDE,
  RATE_LIMIT_METADATA,
  RATE_LIMITER_OPTIONS,
  SKIP_GLOBAL_RATE_LIMIT,
} from '../../module/rate-limiter.constants';

import type { RateLimitContext, RateLimiterModuleOptions } from '../../module/rate-limiter.interfaces';

import type { RateLimitEntry, RateLimitMetadata } from '../../core/types';

import { RateLimitContextFactory } from '../http/context.factory';

import { ContextResolverService } from '../../core/context/context-resolver.service';

import { RateLimitOrchestrator } from '../../core/orchestrator';

import { RateLimitHeaderWriter } from '../http/header.writer';

import { RateLimiterInfrastructureError } from '../../errors/rate-limiter.errors';

@Injectable()
export class RateLimiterGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly contextFactory: RateLimitContextFactory,
    private readonly contextResolver: ContextResolverService,
    private readonly orchestrator: RateLimitOrchestrator,

    @Inject(RATE_LIMITER_OPTIONS)
    private readonly options: RateLimiterModuleOptions,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== 'http') {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();

    const response = context.switchToHttp().getResponse<Response>();

    const metadata = this.resolveMetadata(context);

    const baseContext = this.contextFactory.create(request, metadata.keyOverride);

    const resolvedContext = await this.contextResolver.resolve(
      request,
      baseContext,
      metadata.globalResolver,
      metadata.routeResolver,
    );

    (request as Request & { __rateLimitContext?: RateLimitContext }).__rateLimitContext = resolvedContext;

    try {
      const result = await this.orchestrator.evaluate({
        limiters: metadata.limiters,
        context: resolvedContext,
        skipGlobal: metadata.skipGlobal,
      });

      if (!result.allowed) {
        this.applyHeaders(response, result);

        const retryAfter = typeof result.retryAfter === 'number' ? Math.max(1, Math.ceil(result.retryAfter)) : 1;

        throw new HttpException(
          {
            message: result.message,
            code: result.errorCode,
            retryAfter,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      this.applySuccessHeaders(response, result);

      return true;
    } catch (err) {
      if (err instanceof RateLimiterInfrastructureError) {
        throw new ServiceUnavailableException('Rate limiter temporarily unavailable');
      }

      if (err instanceof Error && err.name === 'RateLimiterConfigurationError') {
        throw new InternalServerErrorException('Rate limiter configuration invalid');
      }

      if (err instanceof Error && err.name === 'RateLimiterConsistencyError') {
        throw new InternalServerErrorException('Rate limiter consistency violation');
      }

      throw err;
    }
  }

  private resolveMetadata(context: ExecutionContext) {
    const skipGlobal =
      this.reflector.getAllAndOverride<boolean>(SKIP_GLOBAL_RATE_LIMIT, [context.getHandler(), context.getClass()]) ??
      false;

    const routeResolver = this.reflector.getAllAndOverride<
      ((req: Request) => Partial<RateLimitContext> | Promise<Partial<RateLimitContext>>) | undefined
    >(RATE_LIMIT_CONTEXT_RESOLVER, [context.getHandler(), context.getClass()]);

    const rawLimiters =
      this.reflector.getAllAndMerge<RateLimitMetadata<string>[]>(RATE_LIMIT_METADATA, [
        context.getClass(),
        context.getHandler(),
      ]) ?? [];

    const limiters: RateLimitEntry<string>[] = rawLimiters.map((entry) =>
      typeof entry === 'string'
        ? {
            name: entry,
          }
        : entry,
    );

    const keyOverride = this.reflector.getAllAndOverride<string | undefined>(RATE_LIMIT_KEY_OVERRIDE, [
      context.getHandler(),
      context.getClass(),
    ]);

    return {
      skipGlobal,
      routeResolver,
      limiters,
      keyOverride,
      globalResolver: this.options.contextResolver,
    };
  }

  private applyHeaders(
    response: Response,
    result: {
      effectiveLimiter?: string;
      retryAfter?: number;
      exposure?: {
        exposeInHeaders: boolean;
      };
      remaining?: number | null;
    },
  ): void {
    if (!result.effectiveLimiter || !result.retryAfter || result.exposure?.exposeInHeaders === false) {
      return;
    }

    RateLimitHeaderWriter.apply(response, result.effectiveLimiter, result.retryAfter * 1000, result.exposure);

    if (result.remaining === 0) {
      response.setHeader('RateLimit-Remaining', '0');
    }
  }

  private applySuccessHeaders(
    response: Response,
    result: {
      effectiveLimiter?: string;
      exposure?: { exposeInHeaders: boolean };
      remaining?: number | null;
    },
  ): void {
    if (!result.effectiveLimiter) {
      return;
    }

    if (result.exposure?.exposeInHeaders === false) {
      return;
    }

    if (typeof result.remaining === 'number') {
      response.setHeader('RateLimit-Remaining', String(result.remaining));
    }
  }
}

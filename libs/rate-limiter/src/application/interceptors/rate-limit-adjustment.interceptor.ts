import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';

import { Reflector } from '@nestjs/core';

import { Observable, catchError, from, map, mergeMap, throwError } from 'rxjs';

import type { Request } from 'express';

import { createHash, randomUUID } from 'node:crypto';

import {
  RATE_LIMIT_PENALTY_METADATA,
  RATE_LIMIT_REWARD_METADATA,
  type RateLimitAdjustmentMetadata,
} from '../../module/rate-limiter.constants';

import type { RateLimitContext } from '../../module/rate-limiter.interfaces';

import { RateLimitOrchestrator } from '../../core/orchestrator';
import { optionalProp } from '../../core/utils/object.utils';

@Injectable()
export class RateLimitAdjustmentInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RateLimitAdjustmentInterceptor.name);
  constructor(
    private readonly reflector: Reflector,
    private readonly orchestrator: RateLimitOrchestrator,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<Request>();

    const rateLimitContext = (
      request as Request & {
        __rateLimitContext?: RateLimitContext;
      }
    ).__rateLimitContext;

    return next.handle().pipe(
      mergeMap((value: unknown) => from(this.applyReward(context, rateLimitContext)).pipe(map(() => value))),

      catchError((err: Error) => {
        return from(this.applyPenalty(context, rateLimitContext)).pipe(mergeMap(() => throwError(() => err)));
      }),
    );
  }

  private async applyReward(context: ExecutionContext, rateLimitContext?: RateLimitContext): Promise<void> {
    if (!rateLimitContext) {
      return;
    }

    const metadata = this.reflector.getAllAndOverride<RateLimitAdjustmentMetadata | undefined>(
      RATE_LIMIT_REWARD_METADATA,
      [context.getHandler(), context.getClass()],
    );

    if (!metadata) {
      return;
    }

    try {
      await this.orchestrator.reward(metadata.limiter, rateLimitContext, {
        operationId: this.buildOperationId(context, metadata.limiter, 'reward'),

        ...optionalProp('amount', metadata.amount),

        ...optionalProp('reason', metadata.reason),
      });
    } catch (err) {
      this.logAdjustmentFailure('reward', metadata.limiter, err);
    }
  }

  private async applyPenalty(context: ExecutionContext, rateLimitContext?: RateLimitContext): Promise<void> {
    if (!rateLimitContext) {
      return;
    }

    const metadata = this.reflector.getAllAndOverride<RateLimitAdjustmentMetadata | undefined>(
      RATE_LIMIT_PENALTY_METADATA,
      [context.getHandler(), context.getClass()],
    );

    if (!metadata) {
      return;
    }

    try {
      await this.orchestrator.penalty(metadata.limiter, rateLimitContext, {
        operationId: this.buildOperationId(context, metadata.limiter, 'penalty'),

        ...optionalProp('amount', metadata.amount),

        ...optionalProp('reason', metadata.reason),
      });
    } catch (err) {
      this.logAdjustmentFailure('penalty', metadata.limiter, err);
    }
  }

  private logAdjustmentFailure(type: 'reward' | 'penalty', limiter: string, err: unknown): void {
    this.logger.warn(
      [
        'Rate limit adjustment failed',
        `type=${type}`,
        `limiter=${limiter}`,
        `recoverable=true`,
        `error=${err instanceof Error ? err.name : 'UnknownError'}`,
      ].join(' '),
    );
  }

  private buildOperationId(context: ExecutionContext, limiter: string, type: 'reward' | 'penalty'): string {
    const request = context.switchToHttp().getRequest<Request>();

    const explicitRequestId =
      typeof request.headers['x-request-id'] === 'string' ? request.headers['x-request-id'] : randomUUID();

    return createHash('sha256').update([type, limiter, explicitRequestId].join('|')).digest('hex');
  }
}
